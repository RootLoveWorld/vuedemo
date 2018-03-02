<template>
  <div class="hello">
    <h1>{{ msg }}</h1>
    <h2>Essential Links</h2>
    <ul>
      <li>
        <a
          href="https://vuejs.org"
          target="_blank"
        >
          Core Docs
        </a>
      </li>
      <li>
        <a
          href="https://forum.vuejs.org"
          target="_blank"
        >
          Forum
        </a>
      </li>
      <li>
        <a
          href="https://chat.vuejs.org"
          target="_blank"
        >
          Community Chat
        </a>
      </li>
      <li>
        <a
          href="https://twitter.com/vuejs"
          target="_blank"
        >
          Twitter
        </a>
      </li>
      <br>
      <li>
        <a
          href="http://vuejs-templates.github.io/webpack/"
          target="_blank"
        >
          Docs for This Template
        </a>
      </li>
    </ul>
    <h2>Ecosystem</h2>
    <ul>
      <li>
        <a
          href="http://router.vuejs.org/"
          target="_blank"
        >
          vue-router
        </a>
      </li>
      <li>
        <a
          href="http://vuex.vuejs.org/"
          target="_blank"
        >
          vuex
        </a>
      </li>
      <li>
        <a
          href="http://vue-loader.vuejs.org/"
          target="_blank"
        >
          vue-loader
        </a>
      </li>
      <li>
        <a
          href="https://github.com/vuejs/awesome-vue"
          target="_blank"
        >
          awesome-vue
        </a>
      </li>
    </ul>
    <br/>
     <span v-bind:title="message">
        鼠标悬停几秒钟查看此处动态绑定的提示信息！
     </span>
      <br/>
      <p v-if="seen">现在你看到我了</p>
      <button v-on:click="isShow">{{btnName}} </button>
      <br/>
      <div>
          <ol>
            <li v-for="todo in todos" :key="todo.key" >
              {{todo.text}}
            </li>
          </ol>

      </div>
      <h1 v-if="ok">Yes</h1>
      <h1 v-else>No</h1>
  <div>
      时间：{{now}}
  </div>
      <br/>
      <br/>
    <div>
      链接：<router-link to="/home">link Home</router-link>
    </div>  


    <br/>
     <!--<button v-on:click="initEchart">显示图表</button>-->
    <div id="echartDemo" style="height:400px;width:800px">

    </div>
  </div>

</template>

<script>
export default {
  name: 'HelloWorld',
  data:function () {
    return {
      msg: 'Welcome to Miracle\'s Vue.js App',
      seen:true,
      message:"To  Test "+ new Date().toLocaleString(),
      btnName:"看不见",
      todos:[
      {key:'l1', text: '学习 JavaScript' },
      {key:'l2', text: '学习 Vue' },
      {key:'l3', text: '整个牛项目' }
    ],
    ok:false
    }
  },
  mounted:function(){
    console.log("====","调用不到methods",this);
     this.$nextTick(function () {
        this.initEchart();
     });
    //initEchart();  //mounted 不会承诺所有的子组件也都一起被挂载。
  },
  methods:{
    isShow:function(event){

      this.$data.btnName = this.$data.seen ? "看得见" : "看不见";
      this.$data.seen =  !this.$data.seen;

      console.log("event==",event,this.$data)
    },
    initEchart:function(){
      //初始化echart实例，获取dom
      var echartDemo = this.$echarts.init(document.getElementById('echartDemo'));
      const option = {
          color: ['#618FC8'],
          backgroundColor:'#F8F8F8',
          tooltip : {
              trigger: 'axis',
              axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                  type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
              }
          },
          grid: {
              left: '3%',
              right: '4%',
              bottom: '3%',
              top:20,
              containLabel: true
          },
          xAxis : [
              {
                  type : 'category',
                  data : ['Decade Ⅰ', 'Decade Ⅱ', 'Decade Ⅲ'],
                  axisTick: {
                      alignWithLabel: true
                  }
              }
          ],
          yAxis : [
              {
                  type : 'value',
                  min:1600,
                  max:2100,
                  interval: 50,
              }
          ],
          series : [
              {
                  name:'新增订单',
                  type:'bar',
                  barWidth: '40%',
                  data:[1770, 1852, 2000]
              }
          ]
      };
      echartDemo.setOption(option);
    }
  },
  computed: {
    now: function () {
      return Date.now()
    }
}
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
