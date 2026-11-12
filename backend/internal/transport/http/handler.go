package http

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"

	"okei-fest-backend/internal/domain"
	"okei-fest-backend/internal/service"
)

const (
	localPlayerIDKey = "player_id"
	localRoleKey     = "role"
)

// Handler exposes HTTP routes for the festival API.
type Handler struct {
	svc *service.FestivalService
}

// NewHandler creates a Handler.
func NewHandler(svc *service.FestivalService) *Handler {
	return &Handler{svc: svc}
}

// RegisterRoutes wires public, player, and admin endpoints.
func (h *Handler) RegisterRoutes(app *fiber.App) {
	api := app.Group("/api")

	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api.Post("/auth/enter", h.enter)
	api.Get("/leaderboard", h.leaderboard)

	scoresLimiter := limiter.New(limiter.Config{
		Max:        30,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "слишком частые запросы"})
		},
	})

	// Player-authenticated routes
	api.Get("/me", h.requireRole("player"), h.getMe)
	api.Post("/scores", h.requireRole("player"), scoresLimiter, h.submitScore)

	// Admin routes
	api.Post("/admin/login", h.adminLogin)
	admin := api.Group("/admin", h.requireRole("admin"))
	admin.Get("/players", h.adminListPlayers)
	admin.Post("/players", h.adminCreatePlayer)
	admin.Patch("/players/:id/scores", h.adminUpdatePlayer)
	admin.Delete("/players/:id", h.adminDeletePlayer)
	admin.Delete("/reset", h.adminResetAll)
}

// ErrorHandler maps domain errors to clean JSON responses without leaking internals.
func ErrorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	msg := "внутренняя ошибка сервера"

	var fiberErr *fiber.Error
	if errors.As(err, &fiberErr) {
		code = fiberErr.Code
		msg = fiberErr.Message
	} else if errors.Is(err, domain.ErrInvalidInput) {
		code = fiber.StatusBadRequest
		msg = err.Error()
	} else if errors.Is(err, domain.ErrUnauthorized) {
		code = fiber.StatusUnauthorized
		msg = "требуется авторизация"
	} else if errors.Is(err, domain.ErrNotFound) {
		code = fiber.StatusNotFound
		msg = "участник не найден"
	}

	return c.Status(code).JSON(fiber.Map{"error": msg})
}

func (h *Handler) enter(c *fiber.Ctx) error {
	var req domain.EnterRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "некорректный JSON")
	}
	token, summary, err := h.svc.Enter(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{
		"token":  token,
		"player": summary,
	})
}

func (h *Handler) leaderboard(c *fiber.Ctx) error {
	lb, err := h.svc.Leaderboard(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(lb)
}

func (h *Handler) getMe(c *fiber.Ctx) error {
	playerID, ok := c.Locals(localPlayerIDKey).(uint)
	if !ok || playerID == 0 {
		return domain.ErrUnauthorized
	}
	summary, err := h.svc.GetMe(c.UserContext(), playerID)
	if err != nil {
		return err
	}
	return c.JSON(summary)
}

func (h *Handler) submitScore(c *fiber.Ctx) error {
	playerID, ok := c.Locals(localPlayerIDKey).(uint)
	if !ok || playerID == 0 {
		return domain.ErrUnauthorized
	}
	var req domain.SubmitScoreRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "некорректный JSON")
	}
	summary, err := h.svc.SubmitScore(c.UserContext(), playerID, req)
	if err != nil {
		return err
	}
	return c.JSON(summary)
}

func (h *Handler) adminLogin(c *fiber.Ctx) error {
	var req domain.AdminLoginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "некорректный JSON")
	}
	token, err := h.svc.AdminLogin(req.Password)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "неверный пароль администратора")
	}
	return c.JSON(fiber.Map{"token": token})
}

func (h *Handler) adminListPlayers(c *fiber.Ctx) error {
	lb, err := h.svc.Leaderboard(c.UserContext())
	if err != nil {
		return err
	}
	return c.JSON(lb)
}

func (h *Handler) adminCreatePlayer(c *fiber.Ctx) error {
	var req domain.AdminUpdateScoresRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "некорректный JSON")
	}
	summary, err := h.svc.AdminCreatePlayer(c.UserContext(), req)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(summary)
}

func (h *Handler) adminUpdatePlayer(c *fiber.Ctx) error {
	id64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil || id64 == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "некорректный ID участника")
	}
	var req domain.AdminUpdateScoresRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "некорректный JSON")
	}
	summary, err := h.svc.AdminUpdatePlayer(c.UserContext(), uint(id64), req)
	if err != nil {
		return err
	}
	return c.JSON(summary)
}

func (h *Handler) adminDeletePlayer(c *fiber.Ctx) error {
	id64, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil || id64 == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "некорректный ID участника")
	}
	if err := h.svc.AdminDeletePlayer(c.UserContext(), uint(id64)); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) adminResetAll(c *fiber.Ctx) error {
	var body struct {
		Confirm string `json:"confirm"`
	}
	if err := c.BodyParser(&body); err != nil || body.Confirm != "RESET_ALL" {
		return fiber.NewError(fiber.StatusBadRequest, "требуется подтверждение RESET_ALL")
	}
	if err := h.svc.AdminResetAll(c.UserContext()); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"reset": true})
}

func (h *Handler) requireRole(expectedRole string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		auth := c.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			return domain.ErrUnauthorized
		}
		tokenStr := strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
		claims, err := h.svc.ParseToken(tokenStr)
		if err != nil || claims.Role != expectedRole {
			return domain.ErrUnauthorized
		}
		c.Locals(localPlayerIDKey, claims.PlayerID)
		c.Locals(localRoleKey, claims.Role)
		return c.Next()
	}
}

