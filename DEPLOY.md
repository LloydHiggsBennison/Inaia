# 🚀 Guía de Deploy en Vercel

## Paso 1: Preparar el proyecto

```bash
# Instalar dependencias necesarias
npm install @vercel/node
```

## Paso 2: Deploy en Vercel

### Opción A: Desde CLI (Recomendado)

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Login en Vercel
vercel login

# 3. Deploy inicial
vercel

# Sigue las instrucciones:
# - Set up and deploy? Y
# - Which scope? (tu cuenta)
# - Link to existing project? N
# - Project name? (deja el default o cambia)
# - Directory? ./
# - Override settings? N

# 4. Configurar variables de entorno
vercel env add GROQ_API_KEY
# Pega tu API key de Groq

vercel env add CEREBRAS_API_KEY
# Pega tu API key de Cerebras

# 5. Deploy a producción
vercel --prod
```

### Opción B: Desde Dashboard Web

1. Ve a [vercel.com](https://vercel.com)
2. Click en "Add New" → "Project"
3. Importa tu repositorio de GitHub (o sube el código)
4. Configura:
   - Framework Preset: **Other**
   - Build Command: (dejar vacío)
   - Output Directory: `public`
5. Agrega variables de entorno:
   - `GROQ_API_KEY`: tu API key
   - `CEREBRAS_API_KEY`: tu API key
6. Click "Deploy"

## Paso 3: Obtener tu URL

Después del deploy, obtendrás una URL tipo:
```
https://tu-proyecto.vercel.app
```

Tu API estará en:
```
https://tu-proyecto.vercel.app/api/chat
```

## Paso 4: Probar el API

```bash
curl -X POST https://tu-proyecto.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hola"}],"model":"auto"}'
```

## Troubleshooting

### Error: "Function Timeout"
- **Causa**: El free tier tiene timeout de 10s
- **Solución**: Upgrade a Pro ($20/mes) para 60s timeout

### Error: "Missing API Keys"
- **Causa**: Variables de entorno no configuradas
- **Solución**: `vercel env add GROQ_API_KEY` y re-deploy

### Error: "Module not found"
- **Causa**: Dependencias no instaladas
- **Solución**: `npm install` y re-deploy

## Next Steps

Una vez deployado, sigue las instrucciones en `CLI-ALIAS.md` para configurar el comando `chat` en tu terminal.
