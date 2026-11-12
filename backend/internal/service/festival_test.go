package service

import (
	"context"
	"path/filepath"
	"testing"

	"okei-fest-backend/internal/domain"
	"okei-fest-backend/internal/repository"
)

func TestFestivalFlowAndAdminBoost(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test.db")
	store, err := repository.NewStore("sqlite://" + dbPath)
	if err != nil {
		t.Fatalf("NewStore: %v", err)
	}
	defer store.Close()

	svc := NewFestivalService(store, "test-secret", "secret-pass")
	ctx := context.Background()

	token, p1, err := svc.Enter(ctx, domain.EnterRequest{
		FullName:  "  Иванов   Иван  ",
		GroupName: " исп-31 ",
	})
	if err != nil {
		t.Fatalf("Enter failed: %v", err)
	}
	if token == "" || p1.FullName != "Иванов Иван" || p1.GroupName != "ИСП-31" {
		t.Fatalf("unexpected player normalization: %+v", p1)
	}

	// Best score only increases
	if _, err := svc.SubmitScore(ctx, p1.ID, domain.SubmitScoreRequest{GameID: "dino", Score: 350}); err != nil {
		t.Fatalf("SubmitScore 1: %v", err)
	}
	p1, err = svc.SubmitScore(ctx, p1.ID, domain.SubmitScoreRequest{GameID: "dino", Score: 120})
	if err != nil {
		t.Fatalf("SubmitScore 2: %v", err)
	}
	if p1.Games.Dino != 350 || p1.TotalScore != 350 {
		t.Fatalf("expected best score 350 to persist, got %+v", p1)
	}

	// Re-entering with different Cyrillic casing must resume the SAME player without duplicating
	_, p1Again, err := svc.Enter(ctx, domain.EnterRequest{
		FullName:  "иванов иван",
		GroupName: "ИСП-31",
	})
	if err != nil {
		t.Fatalf("Re-enter failed: %v", err)
	}
	if p1Again.ID != p1.ID || p1Again.Games.Dino != 350 {
		t.Fatalf("expected same player ID %d with 350 dino score, got ID %d score %d", p1.ID, p1Again.ID, p1Again.Games.Dino)
	}

	// Admin boost
	bonus := 500
	gd := 999
	updated, err := svc.AdminUpdatePlayer(ctx, p1.ID, domain.AdminUpdateScoresRequest{
		GD:         &gd,
		BonusScore: &bonus,
	})
	if err != nil {
		t.Fatalf("AdminUpdatePlayer: %v", err)
	}
	if updated.TotalScore != 350+999+500 {
		t.Fatalf("expected boosted total 1849, got %d", updated.TotalScore)
	}

	// Admin auth check
	if _, err := svc.AdminLogin("wrong"); err == nil {
		t.Fatal("expected error for wrong admin password")
	}
	adminTok, err := svc.AdminLogin("secret-pass")
	if err != nil || adminTok == "" {
		t.Fatalf("expected valid admin token, got err=%v", err)
	}
}

