package repository

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"

	"okei-fest-backend/internal/domain"
)

// Store wraps GORM database operations for players and scores.
type Store struct {
	db *gorm.DB
}

// NewStore opens PostgreSQL or SQLite based on dsn and runs schema migration.
func NewStore(dsn string) (*Store, error) {
	cfg := &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Silent),
		PrepareStmt: true,
	}

	var db *gorm.DB
	var err error

	if strings.HasPrefix(dsn, "postgres://") || strings.HasPrefix(dsn, "postgresql://") {
		db, err = gorm.Open(postgres.Open(dsn), cfg)
	} else {
		path := strings.TrimPrefix(dsn, "sqlite://")
		if path == "" {
			path = "./data/festival.db"
		}
		if dir := filepath.Dir(path); dir != "." && dir != "" {
			if mkErr := os.MkdirAll(dir, 0o755); mkErr != nil {
				return nil, mkErr
			}
		}
		db, err = gorm.Open(sqlite.Open(path), cfg)
	}
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)

	if err := db.AutoMigrate(&domain.Player{}, &domain.Score{}); err != nil {
		return nil, err
	}
	if err := backfillAndDeduplicatePlayers(db); err != nil {
		return nil, err
	}
	if err := db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_players_normalized_key ON players (normalized_key)").Error; err != nil {
		return nil, err
	}

	return &Store{db: db}, nil
}

// Close releases underlying database connections.
func (s *Store) Close() error {
	sqlDB, err := s.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

// MakePlayerKey builds a Unicode-normalized lookup key so Cyrillic case differences never create duplicates.
func MakePlayerKey(fullName, groupName string) string {
	norm := func(v string) string {
		s := strings.Join(strings.Fields(strings.TrimSpace(v)), " ")
		s = strings.ToLower(s)
		return strings.ReplaceAll(s, "ё", "е")
	}
	return norm(fullName) + "|" + norm(groupName)
}

func backfillAndDeduplicatePlayers(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var players []domain.Player
		if err := tx.Preload("Scores").Order("id ASC").Find(&players).Error; err != nil {
			return err
		}

		primaryByKey := make(map[string]domain.Player, len(players))
		bestByPrimaryGame := make(map[uint]map[string]domain.Score)

		for _, p := range players {
			key := MakePlayerKey(p.FullName, p.GroupName)
			primary, exists := primaryByKey[key]
			if !exists {
				if p.NormalizedKey != key {
					if err := tx.Model(&p).Update("normalized_key", key).Error; err != nil {
						return err
					}
					p.NormalizedKey = key
				}
				primaryByKey[key] = p
				gameMap := make(map[string]domain.Score, len(p.Scores))
				for _, sc := range p.Scores {
					gameMap[sc.GameID] = sc
				}
				bestByPrimaryGame[p.ID] = gameMap
				continue
			}

			// Merge duplicate player's bonus and game high scores into the primary record.
			if p.BonusScore > primary.BonusScore {
				if err := tx.Model(&primary).Update("bonus_score", p.BonusScore).Error; err != nil {
					return err
				}
				primary.BonusScore = p.BonusScore
				primaryByKey[key] = primary
			}

			primaryScores := bestByPrimaryGame[primary.ID]
			for _, dupScore := range p.Scores {
				cur, has := primaryScores[dupScore.GameID]
				if !has {
					err := tx.Create(&domain.Score{
						PlayerID:   primary.ID,
						GameID:     dupScore.GameID,
						BestScore:  dupScore.BestScore,
						PlaysCount: dupScore.PlaysCount,
					}).Error
					if err != nil {
						return err
					}
					primaryScores[dupScore.GameID] = dupScore
				} else {
					newBest := max(cur.BestScore, dupScore.BestScore)
					newPlays := cur.PlaysCount + dupScore.PlaysCount
					if err := tx.Model(&domain.Score{}).
						Where("player_id = ? AND game_id = ?", primary.ID, dupScore.GameID).
						Updates(map[string]any{"best_score": newBest, "plays_count": newPlays}).Error; err != nil {
						return err
					}
					cur.BestScore = newBest
					cur.PlaysCount = newPlays
					primaryScores[dupScore.GameID] = cur
				}
			}

			if err := tx.Where("player_id = ?", p.ID).Delete(&domain.Score{}).Error; err != nil {
				return err
			}
			if err := tx.Delete(&domain.Player{}, p.ID).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

// FindOrCreatePlayer looks up a player case-insensitively (Unicode-safe) by full name and group, creating one if absent.
func (s *Store) FindOrCreatePlayer(ctx context.Context, fullName, groupName string) (domain.Player, error) {
	key := MakePlayerKey(fullName, groupName)
	var player domain.Player
	err := s.db.WithContext(ctx).
		Where("normalized_key = ?", key).
		First(&player).Error
	if err == nil {
		return player, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return domain.Player{}, err
	}

	player = domain.Player{
		FullName:      fullName,
		GroupName:     groupName,
		NormalizedKey: key,
	}
	if err := s.db.WithContext(ctx).Create(&player).Error; err != nil {
		// Handle concurrent creation race by re-fetching the winner row.
		if retryErr := s.db.WithContext(ctx).Where("normalized_key = ?", key).First(&player).Error; retryErr == nil {
			return player, nil
		}
		return domain.Player{}, err
	}
	return player, nil
}

// UpsertBestScore records a game run and keeps the highest score achieved.
func (s *Store) UpsertBestScore(ctx context.Context, playerID uint, gameID string, newScore int) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var existing domain.Score
		err := tx.Where("player_id = ? AND game_id = ?", playerID, gameID).First(&existing).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return tx.Create(&domain.Score{
				PlayerID:   playerID,
				GameID:     gameID,
				BestScore:  newScore,
				PlaysCount: 1,
			}).Error
		}
		if err != nil {
			return err
		}

		updates := map[string]any{
			"plays_count": existing.PlaysCount + 1,
			"updated_at":  time.Now(),
		}
		if newScore > existing.BestScore {
			updates["best_score"] = newScore
		}
		if err := tx.Model(&existing).Updates(updates).Error; err != nil {
			return err
		}
		return tx.Model(&domain.Player{}).Where("id = ?", playerID).Update("updated_at", time.Now()).Error
	})
}

// GetLeaderboard computes ranked player and group standings.
func (s *Store) GetLeaderboard(ctx context.Context) (domain.LeaderboardResponse, error) {
	var players []domain.Player
	if err := s.db.WithContext(ctx).Preload("Scores").Find(&players).Error; err != nil {
		return domain.LeaderboardResponse{}, err
	}

	summaries := make([]domain.PlayerSummary, 0, len(players))
	groupMap := make(map[string]*domain.GroupSummary)

	for _, p := range players {
		summary := buildSummary(p)
		summaries = append(summaries, summary)

		gKey := strings.ToUpper(strings.TrimSpace(p.GroupName))
		grp, ok := groupMap[gKey]
		if !ok {
			grp = &domain.GroupSummary{GroupName: p.GroupName}
			groupMap[gKey] = grp
		}
		grp.PlayersCount++
		grp.TotalScore += summary.TotalScore
	}

	sort.Slice(summaries, func(i, j int) bool {
		if summaries[i].TotalScore != summaries[j].TotalScore {
			return summaries[i].TotalScore > summaries[j].TotalScore
		}
		if summaries[i].GamesDone != summaries[j].GamesDone {
			return summaries[i].GamesDone > summaries[j].GamesDone
		}
		return summaries[i].ID < summaries[j].ID
	})
	for i := range summaries {
		summaries[i].Rank = i + 1
	}

	groups := make([]domain.GroupSummary, 0, len(groupMap))
	for _, g := range groupMap {
		if g.PlayersCount > 0 {
			g.AvgScore = g.TotalScore / g.PlayersCount
		}
		groups = append(groups, *g)
	}
	sort.Slice(groups, func(i, j int) bool {
		if groups[i].TotalScore != groups[j].TotalScore {
			return groups[i].TotalScore > groups[j].TotalScore
		}
		return groups[i].AvgScore > groups[j].AvgScore
	})
	for i := range groups {
		groups[i].Rank = i + 1
	}

	return domain.LeaderboardResponse{
		Players: summaries,
		Groups:  groups,
	}, nil
}

// GetPlayerSummary returns one player's summary including their current leaderboard rank.
func (s *Store) GetPlayerSummary(ctx context.Context, playerID uint) (domain.PlayerSummary, error) {
	var player domain.Player
	err := s.db.WithContext(ctx).Preload("Scores").First(&player, playerID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return domain.PlayerSummary{}, domain.ErrNotFound
		}
		return domain.PlayerSummary{}, err
	}

	summary := buildSummary(player)

	var higherCount int64
	err = s.db.WithContext(ctx).
		Model(&domain.Player{}).
		Where("(bonus_score + COALESCE((SELECT SUM(best_score) FROM scores WHERE scores.player_id = players.id), 0)) > ?", summary.TotalScore).
		Count(&higherCount).Error
	if err != nil {
		return domain.PlayerSummary{}, err
	}

	summary.Rank = int(higherCount) + 1
	return summary, nil
}

// AdminUpdatePlayer updates a player's profile fields, game scores, and bonus points.
func (s *Store) AdminUpdatePlayer(ctx context.Context, playerID uint, req domain.AdminUpdateScoresRequest) (domain.PlayerSummary, error) {
	err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var p domain.Player
		if err := tx.First(&p, playerID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domain.ErrNotFound
			}
			return err
		}

		playerUpdates := map[string]any{"updated_at": time.Now()}
		if req.FullName != nil && strings.TrimSpace(*req.FullName) != "" {
			playerUpdates["full_name"] = strings.TrimSpace(*req.FullName)
		}
		if req.GroupName != nil && strings.TrimSpace(*req.GroupName) != "" {
			playerUpdates["group_name"] = strings.TrimSpace(*req.GroupName)
		}
		if req.BonusScore != nil {
			playerUpdates["bonus_score"] = *req.BonusScore
		}
		if err := tx.Model(&p).Updates(playerUpdates).Error; err != nil {
			return err
		}

		gameUpdates := map[string]*int{
			"dino":   req.Dino,
			"snake":  req.Snake,
			"gd":     req.GD,
			"block":  req.Block,
			"subway": req.Subway,
		}
		for gameID, val := range gameUpdates {
			if val == nil {
				continue
			}
			scoreVal := max(*val, 0)
			err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "player_id"}, {Name: "game_id"}},
				DoUpdates: clause.Assignments(map[string]any{"best_score": scoreVal, "updated_at": time.Now()}),
			}).Create(&domain.Score{
				PlayerID:   playerID,
				GameID:     gameID,
				BestScore:  scoreVal,
				PlaysCount: 1,
			}).Error
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return domain.PlayerSummary{}, err
	}
	return s.GetPlayerSummary(ctx, playerID)
}

// AdminDeletePlayer removes a player and all associated scores.
func (s *Store) AdminDeletePlayer(ctx context.Context, playerID uint) error {
	res := s.db.WithContext(ctx).Delete(&domain.Player{}, playerID)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// AdminResetAll wipes all scores and players for a fresh start.
func (s *Store) AdminResetAll(ctx context.Context) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&domain.Score{}).Error; err != nil {
			return err
		}
		return tx.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&domain.Player{}).Error
	})
}

func buildSummary(p domain.Player) domain.PlayerSummary {
	var games domain.GameScoresMap
	done := 0
	total := p.BonusScore

	for _, sc := range p.Scores {
		if sc.PlaysCount > 0 || sc.BestScore > 0 {
			done++
		}
		total += sc.BestScore
		switch sc.GameID {
		case "dino":
			games.Dino = sc.BestScore
		case "snake":
			games.Snake = sc.BestScore
		case "gd":
			games.GD = sc.BestScore
		case "block":
			games.Block = sc.BestScore
		case "subway":
			games.Subway = sc.BestScore
		}
	}

	return domain.PlayerSummary{
		ID:         p.ID,
		FullName:   p.FullName,
		GroupName:  p.GroupName,
		Games:      games,
		BonusScore: p.BonusScore,
		TotalScore: total,
		GamesDone:  done,
		UpdatedAt:  p.UpdatedAt,
	}
}

