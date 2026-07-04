-- Made by bashnav
-- https://github.com/bashnav

--[[
    restartserver.lua -> ServerScriptService
	Este script consulta periódicamente (polling) al bot de Discord
    para saber si se solicitó un reinicio. Si es así:
      1. Expulsa (Kick) a todos los jugadores con un mensaje.
      2. Avisa al bot que ya se procesó el reinicio.
      3. Al quedar el servidor vacío, Roblox lo cierra automáticamente
         y los nuevos jugadores entrarán a un servidor nuevo.

    IMPORTANTE:
      - Debes activar "Allow HTTP Requests" en:
        Game Settings -> Security -> Allow HTTP Requests
-----------------------------------------------------------------------]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- ==================== CONFIGURACIÓN ====================
local BOT_SERVER_URL = "https://tu-bot-en-la-nube.com"
local SECRET_TOKEN = "un_token_secreto_bien_largo_y_dificil_de_adivinar"
local POLL_INTERVAL_SECONDS = 5 -- intervalo de 5 sec (el developer puede modificar)
local KICK_MESSAGE = "El servidor se está reiniciando. Vuelve a unirte en unos segundos."
-- =========================================================

-- Consulta al bot si hay un reinicio pendiente.
-- Devuelve true/false. Si falla la conexión, devuelve false.
local function isRestartRequested()
	local success, result = pcall(function()
		return HttpService:RequestAsync({
			Url = BOT_SERVER_URL .. "/check-restart",
			Method = "GET",
			Headers = {
				["Authorization"] = "Bearer " .. SECRET_TOKEN,
			},
		})
	end)

	if not success then
		warn("[RestartHandler] Error de conexión al consultar al bot:", result)
		return false
	end

	if not result.Success then
		warn("[RestartHandler] El bot respondió con error:", result.StatusCode, result.Body)
		return false
	end

	local ok, data = pcall(function()
		return HttpService:JSONDecode(result.Body)
	end)

	if not ok then
		warn("[RestartHandler] No se pudo interpretar la respuesta del bot.")
		return false
	end

	return data.restart == true
end

-- Avisa al bot que el reinicio ya se procesó (para que resetee el flag).
local function acknowledgeRestart()
	local success, result = pcall(function()
		return HttpService:RequestAsync({
			Url = BOT_SERVER_URL .. "/ack-restart",
			Method = "POST",
			Headers = {
				["Authorization"] = "Bearer " .. SECRET_TOKEN,
				["Content-Type"] = "application/json",
			},
			Body = "{}",
		})
	end)

	if not success then
		warn("[RestartHandler] No se pudo confirmar el reinicio al bot:", result)
	end
end

-- Expulsión de los jugadores
local function kickAllPlayers()
	for _, player in ipairs(Players:GetPlayers()) do
		player:Kick(KICK_MESSAGE)
	end
end

-- Bucle principal de polling.
task.spawn(function()
	while true do
		task.wait(POLL_INTERVAL_SECONDS)

		local shouldRestart = isRestartRequested()
		if shouldRestart then
			print("[RestartHandler] Reinicio solicitado. Expulsando jugadores...")
			kickAllPlayers()
			acknowledgeRestart()

		end
	end
end)
