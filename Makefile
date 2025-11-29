# Makefile for GlobalLink Logistics - React + Vite + Firebase
# Usage: make [target]

# Variables
PROJECT_NAME = globallink-logistics
BUILD_DIR = dist
BACKUP_DIR = backup

# SSH Deployment (Primary - Direct Access)
SSH_HOST = 168.119.48.117
SSH_USER = root
SSH_PASS = nazari@0794
SSH_TARGET_DIR = /www/wwwroot/tracking.818stylist.shop
SSH_PORT = 22

# FTP Deployment (Alternative - Limited Access)
FTP_HOST = "168.119.48.117"
FTP_USER = "ftp_user_shipper"
FTP_PASS = "f5bDdfrcbA8WScWF"
FTP_REMOTE_DIR = "/www/wwwroot/ftp_user_shipper"

# Colors
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[0;33m
BLUE = \033[0;34m
PURPLE = \033[0;35m
CYAN = \033[0;36m
NC = \033[0m

.PHONY: help install clean build dev preview deploy deploy-ftp ssh-test ssh-status backup status

.DEFAULT_GOAL := help

help: ## Show this help
	@echo "$(CYAN)🚛 GlobalLink Logistics - Deployment$(NC)"
	@echo "$(YELLOW)Commands:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	@echo "$(BLUE)📦 Installing...$(NC)"
	npm install
	@echo "$(GREEN)✅ Done!$(NC)"

clean: ## Clean build
	@echo "$(YELLOW)🧹 Cleaning...$(NC)"
	rm -rf $(BUILD_DIR)
	@echo "$(GREEN)✅ Done!$(NC)"

build: clean ## Build project
	@echo "$(BLUE)🔨 Building...$(NC)"
	npm run build
	@echo "$(GREEN)✅ Build complete in $(BUILD_DIR)/$(NC)"

dev: ## Start dev server
	@echo "$(CYAN)🚀 Starting dev...$(NC)"
	npm run dev

preview: build ## Preview build
	@echo "$(CYAN)👀 Preview...$(NC)"
	npm run preview

check-ssh-deps: ## Check sshpass
	@if ! command -v sshpass >/dev/null 2>&1; then \
		echo "$(YELLOW)Installing sshpass...$(NC)"; \
		if command -v brew >/dev/null 2>&1; then \
			brew install hudochenkov/sshpass/sshpass; \
		else \
			echo "$(RED)Please install sshpass manually$(NC)"; \
			exit 1; \
		fi; \
	fi

check-ftp-deps: ## Check lftp
	@if ! command -v lftp >/dev/null 2>&1; then \
		echo "$(YELLOW)Installing lftp...$(NC)"; \
		if command -v brew >/dev/null 2>&1; then \
			brew install lftp; \
		else \
			echo "$(RED)Please install lftp manually$(NC)"; \
			exit 1; \
		fi; \
	fi

ssh-test: check-ssh-deps ## Test SSH
	@echo "$(BLUE)🔗 Testing SSH...$(NC)"
	@if sshpass -p'$(SSH_PASS)' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p $(SSH_PORT) $(SSH_USER)@$(SSH_HOST) 'echo "Connected!"' 2>/dev/null; then \
		echo "$(GREEN)✅ SSH works!$(NC)"; \
	else \
		echo "$(RED)❌ SSH failed$(NC)"; \
		exit 1; \
	fi

deploy: check-ssh-deps build ## 🚀 Deploy via SSH
	@echo "$(PURPLE)🚀 Deploying to tracking.818stylist.shop...$(NC)"
	@cd $(BUILD_DIR) && zip -rq ../deploy.zip .
	@sshpass -p'$(SSH_PASS)' scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null deploy.zip $(SSH_USER)@$(SSH_HOST):$(SSH_TARGET_DIR)/
	@sshpass -p'$(SSH_PASS)' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $(SSH_USER)@$(SSH_HOST) ' \
		cd $(SSH_TARGET_DIR); \
		TIMESTAMP=$$(date +%Y%m%d_%H%M%S); \
		mkdir -p backups; \
		if [ -f "index.html" ]; then \
			mkdir -p backups/backup_$$TIMESTAMP; \
			find . -maxdepth 1 \( -type f -o -type d \) ! -name "." ! -name "backups" ! -name "deploy.zip" -exec mv {} backups/backup_$$TIMESTAMP/ \; 2>/dev/null; \
		fi; \
		unzip -q deploy.zip; \
		rm deploy.zip; \
		find . -type f -exec chmod 644 {} \;; \
		find . -type d -exec chmod 755 {} \;; \
		if [ -f ".htaccess" ]; then chmod 644 .htaccess; fi; \
	'
	@rm -f deploy.zip
	@echo "$(GREEN)🎉 Deployed! https://tracking.818stylist.shop$(NC)"

deploy-ftp: check-ftp-deps build ## Deploy via FTP
	@echo "$(BLUE)📤 Deploying via FTP...$(NC)"
	lftp -c "open -u $(FTP_USER),$(FTP_PASS) $(FTP_HOST); mirror -R $(BUILD_DIR) $(FTP_REMOTE_DIR)"
	@echo "$(GREEN)✅ FTP deploy done!$(NC)"

ssh-status: check-ssh-deps ## Check server
	@echo "$(BLUE)📊 Server status...$(NC)"
	@sshpass -p'$(SSH_PASS)' ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null $(SSH_USER)@$(SSH_HOST) ' \
		cd $(SSH_TARGET_DIR) 2>/dev/null || { echo "$(RED)Not found$(NC)"; exit 1; }; \
		echo "Path: $$(pwd)"; \
		echo "Files: $$(find . -type f | wc -l)"; \
		echo "Size: $$(du -sh . | cut -f1)"; \
		if [ -f "index.html" ]; then echo "$(GREEN)✅ Deployed$(NC)"; fi; \
	'

backup: ## Create backup
	@echo "$(YELLOW)💾 Backup...$(NC)"
	mkdir -p $(BACKUP_DIR)
	tar -czf $(BACKUP_DIR)/backup-$(shell date +%Y%m%d-%H%M%S).tar.gz \
		--exclude=node_modules --exclude=dist --exclude=backup --exclude=.git .
	@echo "$(GREEN)✅ Saved to $(BACKUP_DIR)/$(NC)"

status: ## Project status
	@echo "$(CYAN)📊 Status$(NC)"
	@echo "Node: $(shell node --version)"
	@echo "NPM: $(shell npm --version)"
	@echo "Build: $(if $(wildcard $(BUILD_DIR)),$(GREEN)EXISTS$(NC),$(RED)NONE$(NC))"
	@echo "Modules: $(if $(wildcard node_modules),$(GREEN)OK$(NC),$(RED)NONE$(NC))"
