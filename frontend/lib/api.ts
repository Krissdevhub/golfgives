import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('gg_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const isLoginPage = window.location.pathname === '/login'
      
      // Sirf tab redirect karo agar hum login page pe NAHI hain
      if (!isLoginPage) {
        localStorage.removeItem('gg_token')
        localStorage.removeItem('gg_user')
        window.location.replace('/login') // replace better hota hai href se navigation history ke liye
      }
    }
    return Promise.reject(error)
  },
)

export default api