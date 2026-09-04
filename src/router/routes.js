const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: () => import('@/pages/IndexPage.vue') },
      { path: 'gunluk', name: 'visits', component: () => import('@/pages/VisitsPage.vue') },
      { path: 'gun-sonu', name: 'day-close', component: () => import('@/pages/DayClosePage.vue') },
      { path: 'aboneler', name: 'subscribers', component: () => import('@/pages/SubscribersPage.vue') },
      { path: 'rezervasyon', name: 'reservations', component: () => import('@/pages/ReservationsPage.vue') },
      { path: 'rapor', name: 'report', component: () => import('@/pages/ReportPage.vue') },
      { path: 'gecmis', name: 'history', component: () => import('@/pages/HistoryPage.vue') },
      { path: 'baslangic', name: 'onboarding', component: () => import('@/pages/OnboardingPage.vue') },
      { path: 'tesis', name: 'facility', component: () => import('@/pages/FacilityPage.vue') },
      { path: 'profil', name: 'profile', component: () => import('@/pages/account/ProfilePage.vue') },
    ],
  },
  {
    path: '/giris',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [{ path: '', name: 'login', component: () => import('@/pages/auth/LoginPage.vue') }],
  },
  {
    path: '/kayit',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      { path: '', name: 'register', component: () => import('@/pages/auth/RegisterPage.vue') },
    ],
  },
  {
    path: '/fiyat',
    component: () => import('@/layouts/LegalLayout.vue'),
    children: [{ path: '', name: 'pricing', component: () => import('@/pages/legal/PricingPage.vue') }],
  },
  {
    path: '/surum',
    component: () => import('@/layouts/LegalLayout.vue'),
    children: [{ path: '', name: 'changelog', component: () => import('@/pages/legal/ChangelogPage.vue') }],
  },
  {
    path: '/destek',
    component: () => import('@/layouts/LegalLayout.vue'),
    children: [{ path: '', name: 'support', component: () => import('@/pages/legal/SupportPage.vue') }],
  },
  {
    path: '/kvkk',
    component: () => import('@/layouts/LegalLayout.vue'),
    children: [
      { path: '', name: 'kvkk', meta: { legal: 'kvkk' }, component: () => import('@/pages/legal/LegalPage.vue') },
    ],
  },
  {
    path: '/gizlilik',
    component: () => import('@/layouts/LegalLayout.vue'),
    children: [
      { path: '', name: 'privacy', meta: { legal: 'gizlilik' }, component: () => import('@/pages/legal/LegalPage.vue') },
    ],
  },
  {
    path: '/kullanim-sartlari',
    component: () => import('@/layouts/LegalLayout.vue'),
    children: [
      { path: '', name: 'terms', meta: { legal: 'sartlar' }, component: () => import('@/pages/legal/LegalPage.vue') },
    ],
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes
