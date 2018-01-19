import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/components/HelloWorld'
import home from '@/pages/home'
import exam from '@/pages/exam'
import result from '@/pages/result'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'HelloWorld',
      component: HelloWorld
    },
    {
      path: '/home',
      component: home
    },
    {
      path: '/exam',
      name: 'exam',
      component: exam,
      props: (route) => {id: route.query.id}
    },
    {
      name: 'Result',
      path: '/result',
      component: result
    }
  ]
})
