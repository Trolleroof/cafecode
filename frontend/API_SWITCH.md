# Simple API Switch

## How to Switch Between Render and Localhost

### Default Behavior
By default, the app uses the **Render backend**: `https://cafecode-backend.onrender.com/api`

### To Use Localhost
Set this environment variable in your `frontend/.env.local` file:

```bash
NEXT_PUBLIC_USE_LOCALHOST=true
```

### Quick Commands

**Switch to localhost:**
```bash
echo "NEXT_PUBLIC_USE_LOCALHOST=true" > frontend/.env.local
```

**Switch back to Render:**
```bash
rm frontend/.env.local
# or
echo "" > frontend/.env.local
```

**Check current setting:**
```bash
cat frontend/.env.local
```

### What This Does

- **Without `.env.local`**: Uses Render backend
- **With `NEXT_PUBLIC_USE_LOCALHOST=true`**: Uses localhost:8000
- **Simple toggle**: Just add/remove the environment variable

### Development Workflow

1. **For production**: No `.env.local` file (uses Render)
2. **For local development**: Create `.env.local` with `NEXT_PUBLIC_USE_LOCALHOST=true`
3. **When pushing**: Remove `.env.local` to use Render

### Console Log

In development, you'll see this in the browser console:
```
🔧 API Configuration: {
  baseUrl: "http://localhost:8000/api",  // or Render URL
  useLocalhost: true,                    // or false
  environment: "development"
}
``` 