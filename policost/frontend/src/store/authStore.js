import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      originalAdmin: null, // Stores the admin's original session details

      sidebarOpen: true,
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),

      setImpersonation: (user, accessToken, refreshToken, adminUser, adminAccessToken, adminRefreshToken) =>
        set({
          user, accessToken, refreshToken,
          originalAdmin: { user: adminUser, accessToken: adminAccessToken, refreshToken: adminRefreshToken }
        }),

      clearImpersonation: () => {
        const { originalAdmin } = get()
        if (originalAdmin) {
          set({
            user: originalAdmin.user,
            accessToken: originalAdmin.accessToken,
            refreshToken: originalAdmin.refreshToken,
            originalAdmin: null
          })
        }
      },

      setAccessToken: (accessToken) => set({ accessToken }),

      logout: () => set({ user: null, accessToken: null, refreshToken: null, originalAdmin: null }),

      hasRole: (role) => get().user?.roles?.some(r => r.name === role) ?? false,

      hasAnyRole: (...roles) => roles.some(r => get().hasRole(r)),
    }),
    { name: 'policost-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken, originalAdmin: s.originalAdmin, sidebarOpen: s.sidebarOpen }) }
  )
)
