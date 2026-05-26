import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles/main.css'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

//check database session exists or not to justify keeping logging in
router.beforeEach(async (to, from, next) => {
  if (!to.meta.requiresAuth) {
    return next()
  }

  const token = localStorage.getItem('token')

  if (!token) {
    return next('/auth/login')
  }

  try {
    const res = await fetch(`${apiUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (res.ok) {
      const data = await res.json()
      localStorage.setItem('user', JSON.stringify(data.user))
      next()
    } else {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      next('/auth/login')
    }
  } catch {
    // Backend down — log out for security
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    next('/auth/login')
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')