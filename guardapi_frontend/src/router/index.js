import { createRouter, createWebHistory } from 'vue-router'

// Layouts
import DefaultLayout from '../layouts/DefaultLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'

// Pages
import HomePage from '../views/HomePage.vue'
import UsersPage from '../views/UsersPage.vue'
import LoginPage from '../views/LoginPage.vue'
import NotFoundPage from '../views/NotFoundPage.vue'

const routes = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'Home',
        component: HomePage,
        meta: { title: 'แบบรายงาน รปภ.', requiresAuth: true }
      }
    ]
  },
  {
    path: '/users',
    component: DefaultLayout,
    children: [
      {
        path: '',
        name: 'Users',
        component: UsersPage,
        meta: { title: 'จัดการรายชื่อผู้ใช้งาน', requiresAuth: true }
      }
    ]
  },
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'Login',
        component: LoginPage,
        meta: { title: 'เข้าสู่ระบบระบบรายงาน รปภ.' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFoundPage,
    meta: { title: '404 ไม่พบหน้า' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Navigation guard
router.beforeEach((to, from, next) => {
  // Update page title
  document.title = `${to.meta.title || 'App'} - ระบบรายงาน รปภ.`
  
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    const isAuthenticated = localStorage.getItem('token')
    if (!isAuthenticated) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router