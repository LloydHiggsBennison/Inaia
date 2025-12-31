# 💻 Configurar Alias CLI para Terminal

## Opción 1: Alias Temporal (Cada sesión)

Cada vez que abras PowerShell o la terminal de VSCode, pega este comando:

```powershell
function chat { param($msg, $model="auto") $body = @{messages=@(@{role="user";content=$msg});model=$model} | ConvertTo-Json -Depth 10; $response = Invoke-RestMethod -Uri "https://TU-APP.vercel.app/api/chat" -Method Post -Body $body -ContentType "application/json"; Write-Host $response -ForegroundColor Green }
```

**Reemplaza `TU-APP` con tu URL de Vercel**

Luego úsalo:
```powershell
chat "Explícame JavaScript"
chat "Dame código Python" -model kimi
chat "Razonamiento profundo" -model reasoning
```

---

## Opción 2: Alias Permanente (PowerShell Profile)

### Setup una sola vez:

```powershell
# 1. Abrir el perfil de PowerShell
notepad $PROFILE

# Si dice que no existe:
New-Item -Path $PROFILE -Type File -Force
notepad $PROFILE
```

### 2. Agregar al archivo que se abre:

```powershell
# === Chat AI Alias ===
function chat {
    param(
        [Parameter(Mandatory=$true)]
        [string]$msg,
        [string]$model = "auto"
    )
    
    $url = "https://TU-APP.vercel.app/api/chat"
    
    $body = @{
        messages = @(
            @{
                role = "user"
                content = $msg
            }
        )
        model = $model
    } | ConvertTo-Json -Depth 10
    
    Write-Host "🤖 Preguntando a $model..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
        Write-Host "`n$response" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host "✅ Chat AI CLI loaded! Use: chat 'your question'" -ForegroundColor Green
```

**Reemplaza `TU-APP` con tu URL de Vercel**

### 3. Guardar y recargar:

```powershell
# Guardar el archivo (Ctrl+S) y cerrar notepad

# Recargar el perfil
. $PROFILE
```

### 4. ¡Listo! Ahora funciona siempre:

```powershell
chat "¿Qué es TypeScript?"
chat "Código en Python" -model kimi
chat "Resolver puzzle" -model reasoning
```

---

## Opción 3: Script Portátil (Para PCs sin permisos)

### 1. Crear archivo `chat.ps1`:

```powershell
# chat.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$message,
    [string]$model = "auto"
)

$url = "https://TU-APP.vercel.app/api/chat"

$body = @{
    messages = @(@{role="user";content=$message})
    model = $model
} | ConvertTo-Json -Depth 10

Write-Host "🤖 Preguntando..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    Write-Host "$response" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}
```

### 2. Usar:

```powershell
# Desde donde esté el archivo
.\chat.ps1 "Explícame async/await"
.\chat.ps1 "Dame código" -model kimi

# O con ruta completa
C:\Users\TuUsuario\Documents\chat.ps1 "Tu pregunta"
```

---

## 📋 Modelos Disponibles

- `auto` - Rotación automática (default)
- `kimi` - Kimi K2 (rápido)
- `reasoning` - GPT-OSS-120B (razonamiento profundo)
- `cerebras` - Cerebras Llama (alternativa rápida)

---

## 🔧 Troubleshooting

### "Execution Policy" error
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Respuesta vacía o timeout
- **Causa**: Pregunta muy compleja o Vercel Hobby plan (10s timeout)
- **Solución**: Preguntas más cortas o upgrade a Vercel Pro

### CORS error
- **Causa**: API no configurada correctamente
- **Solución**: Verificar que `/api/chat.ts` esté desplegado
