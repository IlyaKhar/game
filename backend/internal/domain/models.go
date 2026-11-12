package domain

import (
	"errors"
	"time"
)

var (
	ErrNotFound     = errors.New("record not found")
	ErrInvalidInput = errors.New("invalid input")
	ErrUnauthorized = errors.New("unauthorized")
)

// ValidGames lists the 5 festival web game identifiers.
var ValidGames = map[string]bool{
	"dino":   true,
	"snake":  true,
	"gd":     true,
	"block":  true,
	"subway": true,
}

// Player represents a festival participant identified by full name and group.
type Player struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	FullName   string    `gorm:"size:120;not null;index" json:"full_name"`
	GroupName  string    `gorm:"size:40;not null;index" json:"group_name"`
	BonusScore int       `gorm:"not null;default:0" json:"bonus_score"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	Scores     []Score   `gorm:"foreignKey:PlayerID;constraint:OnDelete:CASCADE" json:"-"`
}

// Score stores a player's best score and play count for one game.
type Score struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	PlayerID   uint      `gorm:"not null;uniqueIndex:idx_player_game" json:"player_id"`
	GameID     string    `gorm:"size:20;not null;uniqueIndex:idx_player_game" json:"game_id"`
	BestScore  int       `gorm:"not null;default:0" json:"best_score"`
	PlaysCount int       `gorm:"not null;default:0" json:"plays_count"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// GameScoresMap maps each of the 5 game IDs to its best score.
type GameScoresMap struct {
	Dino   int `json:"dino"`
	Snake  int `json:"snake"`
	GD     int `json:"gd"`
	Block  int `json:"block"`
	Subway int `json:"subway"`
}

// PlayerSummary is the public/admin API representation of a participant and their scores.
type PlayerSummary struct {
	ID         uint          `json:"id"`
	FullName   string        `json:"full_name"`
	GroupName  string        `json:"group_name"`
	Games      GameScoresMap `json:"games"`
	BonusScore int           `json:"bonus_score"`
	TotalScore int           `json:"total_score"`
	GamesDone  int           `json:"games_done"`
	Rank       int           `json:"rank"`
	UpdatedAt  time.Time     `json:"updated_at"`
}

// GroupSummary aggregates scores across a student group.
type GroupSummary struct {
	GroupName    string `json:"group_name"`
	PlayersCount int    `json:"players_count"`
	TotalScore   int    `json:"total_score"`
	AvgScore     int    `json:"avg_score"`
	Rank         int    `json:"rank"`
}

// LeaderboardResponse holds both individual and group standings.
type LeaderboardResponse struct {
	Players []PlayerSummary `json:"players"`
	Groups  []GroupSummary  `json:"groups"`
}

// EnterRequest is sent when a student logs in with ФИО + Группа.
type EnterRequest struct {
	FullName  string `json:"full_name"`
	GroupName string `json:"group_name"`
}

// SubmitScoreRequest records a finished game run.
type SubmitScoreRequest struct {
	GameID string `json:"game_id"`
	Score  int    `json:"score"`
}

// AdminLoginRequest authenticates an organizer.
type AdminLoginRequest struct {
	Password string `json:"password"`
}

// AdminUpdateScoresRequest allows adjusting any game score or bonus points.
type AdminUpdateScoresRequest struct {
	FullName   *string `json:"full_name"`
	GroupName  *string `json:"group_name"`
	Dino       *int    `json:"dino"`
	Snake      *int    `json:"snake"`
	GD         *int    `json:"gd"`
	Block      *int    `json:"block"`
	Subway     *int    `json:"subway"`
	BonusScore *int    `json:"bonus_score"`
}

