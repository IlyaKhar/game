package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"okei-fest-backend/internal/config"
	"okei-fest-backend/internal/repository"
	"okei-fest-backend/internal/service"
	transport "okei-fest-backend/internal/transport/http"
)

func main() {
	cfg := config.Load()

	store, err := repository.NewStore(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}
	defer func() {
		if err := store.Close(); err != nil {
			log.Printf("error closing database: %v", err)
		}
	}()

	svc := service.NewFestivalService(store, cfg.JWTSecret, cfg.AdminPassword)
	handler := transport.NewHandler(svc)

	app := fiber.New(fiber.Config{
		AppName:      "OKEI Game Festival API",
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
		ErrorHandler: transport.ErrorHandler,
	})

	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "${time} | ${status} | ${latency} | ${method} ${path}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.AllowedOrigin,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PATCH, DELETE, OPTIONS",
	}))
	app.Use("/api/auth", limiter.New(limiter.Config{
		Max:        60,
		Expiration: 1 * time.Minute,
	}))
	app.Use("/api/admin/login", limiter.New(limiter.Config{
		Max:        15,
		Expiration: 1 * time.Minute,
	}))

	handler.RegisterRoutes(app)

	go func() {
		log.Printf("OKEI Fest API listening on :%s", cfg.Port)
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Printf("server stopped: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down API gracefully...")
	if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
		log.Printf("graceful shutdown error: %v", err)
	}
}

