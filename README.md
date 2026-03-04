# Delabase Portal - Web App

## Deploy en Vercel (Recomendado)

### Opción 1: Deploy directo desde GitHub
1. Sube este código a un repositorio en GitHub
2. Ve a https://vercel.com y crea una cuenta (gratis)
3. Click "Add New Project"
4. Importa tu repositorio de GitHub
5. En "Environment Variables", agrega:
   - `NEXT_PUBLIC_API_URL` = `https://inmobiliaria-mgr.emergent.host/api`
6. Click "Deploy"

### Opción 2: Deploy con Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

## Configuración de Dominio Personalizado
1. En el dashboard de Vercel, ve a tu proyecto
2. Click en "Settings" → "Domains"
3. Agrega tu dominio (ej: portal.delabase.cl)
4. Configura los DNS según las instrucciones de Vercel

## Variables de Entorno
- `NEXT_PUBLIC_API_URL`: URL del backend (default: https://inmobiliaria-mgr.emergent.host/api)

## Desarrollo Local
```bash
npm install
npm run dev
```

## Credenciales de Prueba
- Email: socio@delabase.cl
- Password: Carola47
