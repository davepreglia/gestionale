import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const baseURL = import.meta.env.VITE_API_URL || '/api'
const api = axios.create({ baseURL })

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = useAuthStore.getState().refreshToken
        const refreshURL = baseURL.endsWith('/api') ? `${baseURL}/auth/refresh` : `${baseURL}/api/auth/refresh`
        const { data } = await axios.post(refreshURL, {}, {
          headers: { Authorization: `Bearer ${refresh}` }
        })
        useAuthStore.getState().setAccessToken(data.data.access_token)
        original.headers.Authorization = `Bearer ${data.data.access_token}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(err)
  }
)

export default api
