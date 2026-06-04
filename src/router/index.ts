import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '@/components/MainLayout.vue'
import WorkOrderList from '@/views/WorkOrderList.vue'
import WorkOrderDetail from '@/views/WorkOrderDetail.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'WorkOrderList',
          component: WorkOrderList
        },
        {
          path: 'detail/:id',
          name: 'WorkOrderDetail',
          component: WorkOrderDetail
        },
        {
          path: 'plan',
          name: 'PlanCalendar',
          component: () => import('@/views/PlanCalendar.vue')
        }
      ]
    },
    {
      path: '/qa',
      name: 'QAPage',
      component: () => import('@/views/QAPage.vue')
    }
  ]
})

export default router
