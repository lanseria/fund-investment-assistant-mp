Component({

  options: {
    addGlobalClass: true,
  },

  properties: {
    fund: {
      type: Object,
      value: {}
    }
  },
  methods: {
    onTap() {
      // 统一派发点击事件，携带 code
      this.triggerEvent('click', { code: this.data.fund.code });
    }
  }
});