package service

import (
	"context"
	"crypto/subtle"
	"fmt"
	"strings"
	"time"
	"unicode"

	"github.com/golang-jwt/jwt/v5"

	"okei-fest-backend/internal/domain"
	"okei-fest-backend/internal/repository"
)

var maxGameScores = map[string]int{
	"dino":   100_000,
	"snake":  50_000,
	"gd":     100_000,
	"block":  200_000,
	"subway": 300_000,
}

// Claims represents signed JWT claims for either a student or an admin.
type Claims struct {
	PlayerID  uint   `json:"player_id,omitempty"`
	FullName  string `json:"full_name,omitempty"`
	GroupName string `json:"group_name,omitempty"`
	Role      string `json:"role"`
	jwt.RegisteredClaims
}

// FestivalService handles authentication, score validation, and admin operations.
type FestivalService struct {
	store         *repository.Store
	jwtSecret     []byte
	adminPassword string
}

// NewFestivalService constructs a FestivalService.
func NewFestivalService(store *repository.Store, jwtSecret, adminPassword string) *FestivalService {
	return &FestivalService{
		store:         store,
		jwtSecret:     []byte(jwtSecret),
		adminPassword: adminPassword,
	}
}

// Enter registers or resumes a student session and returns a signed JWT + player summary.
func (s *FestivalService) Enter(ctx context.Context, req domain.EnterRequest) (string, domain.PlayerSummary, error) {
	fullName := collapseSpaces(req.FullName)
	groupName := strings.ToUpper(collapseSpaces(req.GroupName))

	if len([]rune(fullName)) < 5 || len([]rune(fullName)) > 100 {
		return "", domain.PlayerSummary{}, fmt.Errorf("%w: укажите реальные Фамилию и Имя (от 5 символов)", domain.ErrInvalidInput)
	}

	parts := strings.Fields(fullName)
	if len(parts) < 2 || len(parts) > 3 {
		return "", domain.PlayerSummary{}, fmt.Errorf("%w: введите Фамилию и Имя через пробел", domain.ErrInvalidInput)
	}

	for _, part := range parts {
		runes := []rune(part)
		if len(runes) < 2 {
			return "", domain.PlayerSummary{}, fmt.Errorf("%w: каждое слово в ФИО должно содержать минимум 2 буквы", domain.ErrInvalidInput)
		}
		for _, r := range runes {
			if !unicode.Is(unicode.Cyrillic, r) && r != '-' {
				return "", domain.PlayerSummary{}, fmt.Errorf("%w: ФИО должно содержать только русские буквы", domain.ErrInvalidInput)
			}
		}
	}

	if len([]rune(groupName)) < 2 || len([]rune(groupName)) > 20 {
		return "", domain.PlayerSummary{}, fmt.Errorf("%w: укажите корректную группу (например, ИСП-21)", domain.ErrInvalidInput)
	}

	for _, r := range groupName {
		if !unicode.IsLetter(r) && !unicode.IsDigit(r) && r != '-' {
			return "", domain.PlayerSummary{}, fmt.Errorf("%w: название группы может содержать только буквы, цифры и дефис", domain.ErrInvalidInput)
		}
	}

	player, err := s.store.FindOrCreatePlayer(ctx, fullName, groupName)
	if err != nil {
		return "", domain.PlayerSummary{}, err
	}

	token, err := s.signToken(Claims{
		PlayerID:  player.ID,
		FullName:  player.FullName,
		GroupName: player.GroupName,
		Role:      "player",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})
	if err != nil {
		return "", domain.PlayerSummary{}, err
	}

	summary, err := s.store.GetPlayerSummary(ctx, player.ID)
	if err != nil {
		return "", domain.PlayerSummary{}, err
	}

	return token, summary, nil
}

// SubmitScore validates a game score submission and updates the player's personal best.
func (s *FestivalService) SubmitScore(ctx context.Context, playerID uint, req domain.SubmitScoreRequest) (domain.PlayerSummary, error) {
	gameID := strings.ToLower(strings.TrimSpace(req.GameID))
	if !domain.ValidGames[gameID] {
		return domain.PlayerSummary{}, fmt.Errorf("%w: неизвестная игра", domain.ErrInvalidInput)
	}

	maxAllowed, ok := maxGameScores[gameID]
	if !ok {
		maxAllowed = 100_000
	}
	if req.Score < 0 || req.Score > maxAllowed {
		return domain.PlayerSummary{}, fmt.Errorf("%w: недопустимое количество очков для игры %s", domain.ErrInvalidInput, gameID)
	}

	if err := s.store.UpsertBestScore(ctx, playerID, gameID, req.Score); err != nil {
		return domain.PlayerSummary{}, err
	}
	return s.store.GetPlayerSummary(ctx, playerID)
}

// GetMe returns the authenticated player's summary and rank.
func (s *FestivalService) GetMe(ctx context.Context, playerID uint) (domain.PlayerSummary, error) {
	return s.store.GetPlayerSummary(ctx, playerID)
}

// Leaderboard returns ranked player and group standings.
func (s *FestivalService) Leaderboard(ctx context.Context) (domain.LeaderboardResponse, error) {
	return s.store.GetLeaderboard(ctx)
}

// AdminLogin validates the admin password in constant time and issues an admin JWT.
func (s *FestivalService) AdminLogin(password string) (string, error) {
	if subtle.ConstantTimeCompare([]byte(password), []byte(s.adminPassword)) != 1 {
		return "", domain.ErrUnauthorized
	}
	return s.signToken(Claims{
		Role: "admin",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	})
}

// AdminUpdatePlayer updates a player's info and/or game scores and bonus points.
func (s *FestivalService) AdminUpdatePlayer(ctx context.Context, playerID uint, req domain.AdminUpdateScoresRequest) (domain.PlayerSummary, error) {
	return s.store.AdminUpdatePlayer(ctx, playerID, req)
}

// AdminCreatePlayer creates a player and optionally sets initial scores/bonus.
func (s *FestivalService) AdminCreatePlayer(ctx context.Context, req domain.AdminUpdateScoresRequest) (domain.PlayerSummary, error) {
	if req.FullName == nil || req.GroupName == nil {
		return domain.PlayerSummary{}, fmt.Errorf("%w: укажите ФИО и группу", domain.ErrInvalidInput)
	}
	fullName := collapseSpaces(*req.FullName)
	groupName := strings.ToUpper(collapseSpaces(*req.GroupName))
	if len([]rune(fullName)) < 2 || len([]rune(groupName)) < 2 {
		return domain.PlayerSummary{}, fmt.Errorf("%w: некорректные ФИО или группа", domain.ErrInvalidInput)
	}
	player, err := s.store.FindOrCreatePlayer(ctx, fullName, groupName)
	if err != nil {
		return domain.PlayerSummary{}, err
	}
	return s.store.AdminUpdatePlayer(ctx, player.ID, req)
}

// AdminDeletePlayer deletes a participant.
func (s *FestivalService) AdminDeletePlayer(ctx context.Context, playerID uint) error {
	return s.store.AdminDeletePlayer(ctx, playerID)
}

// AdminResetAll wipes all participants and scores.
func (s *FestivalService) AdminResetAll(ctx context.Context) error {
	return s.store.AdminResetAll(ctx)
}

// ParseToken verifies a JWT and enforces the HMAC signing method.
func (s *FestivalService) ParseToken(tokenStr string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, domain.ErrUnauthorized
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, domain.ErrUnauthorized
	}
	return claims, nil
}

func (s *FestivalService) signToken(claims Claims) (string, error) {
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(s.jwtSecret)
}

func collapseSpaces(s string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(s)), " ")
}
