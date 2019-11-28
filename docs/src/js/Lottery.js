'use strict';

(function(window, document) {
  // constructor
  // @param models [Array<Object>] data models for lottery component
  // @param whenDone [Function] callback when done
  // @param opt_config [Object] optional configurations for Lottery
  function Lottery(models, whenDone, opt_config) {
    this._models = models;
    this._whenDone = whenDone;

    var DEFAULT_SIZE = Math.min(window.innerWidth, window.innerHeight) * 0.4;

    this._configs = Object.assign({}, {
      width: DEFAULT_SIZE,
      height: DEFAULT_SIZE,
      enableRunButton: true,
    }, opt_config || {});

    this._createDom();
  };

  // deconstructor
  Lottery.prototype.dispose = function() {
    if (this._domRootSection && this._domRootSection.parentNode) {
      this._domRootSection.parentNode.removeChild(this._domRootSection);
    }
    this._domRootSection = null;
    this._domCanvasContainer = null;
    this._domCanvas = null;
    if (this._domRun) {
      if (this.onRunButtonClick) this._domRun.removeEventListener('mousedown', this.onRunButtonClick); // unregister event listener
      this._domRun = null;
      this.onRunButtonClick = null;
    }
    this._domList = null;
  };

  Lottery.prototype._models = null;
  Lottery.prototype._whenDone = null;
  Lottery.prototype._configs = null;

  Lottery.prototype._domRootSection = null;
  Lottery.prototype._domCanvasContainer = null;
  Lottery.prototype._domCanvas = null;
  Lottery.prototype._domRun = null;
  Lottery.prototype._domList = null;

  Lottery.prototype.isRunning = false;
  Lottery.prototype.onRunButtonClick = null;
  Lottery.prototype.onTransitionEnd = null;

  Lottery.prototype.hitIndex = -1;

  /** Create the dom tree
  <section id="turntable" class="gb-turntable">
    <div class="gb-turntable-container">
      <canvas class="gb-turntable-canvas" width="300" height="300px">抱歉！浏览器不支持。</canvas>
    </div>

    <a class="gb-turntable-btn" href="javascript:;">抽奖</a>
  </section>
  */
  Lottery.prototype._createDom = function() {
    if (!!this._domRootSection) return;
    var configs = this._configs;
    // 1. Firstly create the root div dom
    this._domRootSection = document.createElement('section');
    this._domRootSection.style.position = 'relative';
    this._domRootSection.style.width = configs.width + 'px';
    this._domRootSection.style.height = configs.height + 'px';
    this._domRootSection.style.borderRadius = '50%';
    this._domRootSection.style.border = (configs.width * 0.05) +
      'px solid #E44025';// 5%
    this._domRootSection.style.boxShadow = '0 2px 3px #333, 0 0 2px #000';

    // 2. create canvas container and canvas
    this._domCanvasContainer = document.createElement('div');
    this._domRootSection.appendChild(this._domCanvasContainer);
    this._domCanvasContainer.style.position = 'absolute';
    this._domCanvasContainer.style.left = '0px';
    this._domCanvasContainer.style.top = '0px';
    this._domCanvasContainer.style.width = 'inherit';
    this._domCanvasContainer.style.height = 'inherit';
    this._domCanvasContainer.style.borderRadius = 'inherit';
    this._domCanvasContainer.style.backgroundClip = 'padding-box';
    this._domCanvasContainer.style.backgroundColor = '#ffcb3f';
    this._domCanvasContainer.style.transition = 'all 3s ease';

    // 3. canvas
    this._domCanvas = document.createElement('canvas');
    this._domCanvasContainer.appendChild(this._domCanvas);
    // Set display size (css pixels).
    this._domCanvas.style.width = 'inherit';
    this._domCanvas.style.height = 'inherit';
    // Set actual size in memory (scaled to account for extra pixel density).
    var ratio = window.devicePixelRatio || 1;
    this._domCanvas.width = ratio * configs.width;
    this._domCanvas.height = ratio * configs.height;
    // Normalize coordinate system to use css pixels.
    this._domCanvas.getContext('2d').scale(ratio, ratio);

    // 4.button
    this._domRun = document.createElement('p');
    this._domRun.style.position = 'absolute';
    this._domRun.style.left = '50%';
    this._domRun.style.top = '50%';
    this._domRun.style.width = configs.width / 3.5 + 'px';
    this._domRun.style.height = configs.height / 3.5 + 'px';
    this._domRun.style.borderRadius = '50%';
    this._domRun.style.color = '#F4E9CC';
    this._domRun.style.backgroundColor = '#E44025';
    this._domRun.style.lineHeight = configs.height / 3.5 + 'px';
    this._domRun.style.textAlign = 'center';
    this._domRun.style.textDecoration = 'none';
    this._domRun.style.transform = 'translate(-50%, -50%)';
    this._domRun.setAttribute('class', 'lottery');
    if (configs.enableRunButton) {
      var that = this;
      this.onRunButtonClick = function(e) {
        if (that._models && that._models.length) {
          that.hitIndex = Math.random() * that._models.length >>> 0;
          // 计算旋转角度
          var deg = that.deg || 0;
          deg = deg + (360 - deg % 360) + (360 * 10 - (that.hitIndex) * (360 / that._models.length));
          that.deg = deg;
          that.onRunLottery(deg);
        }
      };
      this._domRun.addEventListener('mousedown', this.onRunButtonClick, false);
      this._domRun.style.cursor = 'pointer';
      this._domRun.textContent = '抽奖';
    }

    // 5.arrow
    var arrow = this._domRun.cloneNode(true);
    arrow.style.width = configs.width / 3.5 / 2 + 'px';
    arrow.style.height = configs.height / 3.5 / 2 + 'px';
    arrow.style.borderRadius = '0px';
    arrow.style.transform = 'none';
    arrow.textContent = '';
    this._domRootSection.appendChild(arrow);
    this._domRootSection.appendChild(this._domRun);

    arrow.style.transformOrigin = '0% 0%';
    arrow.style.transform = 'rotate(-135deg)';

    this.render();
  };

  Lottery.randomColor = function () {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  Lottery.prototype.mockRun = function() {
    var that = this;
    that.hitIndex = Math.random() * that._models.length >>> 0;
    // 计算旋转角度
    var deg = that.deg || 0;
    deg = deg + (360 - deg % 360) + (360 * 10 - (that.hitIndex) * (360 / that._models.length));
    that.deg = deg;
    that.onRunLottery(deg);
  };

  Lottery.prototype.render = function() {
    if (this._domList) {
      this._domCanvasContainer.removeChild(this._domList);
      this._domList = null;
    }
    var list = document.createElement('ul');
    this._domList = list;
    this._domCanvasContainer.appendChild(list);
    list.style.position = 'absolute';
    list.style.left = '0px';
    list.style.top = '0px';
    list.style.width = 'inherit';
    list.style.height = 'inherit';
    list.style.listStyle = 'none';
    for (var i = 0; i < this._models.length; i++) {
      var item = document.createElement('li');
      list.appendChild(item);
      item.style.position = 'absolute';
      item.style.left = '0px';
      item.style.top = '0px';
      item.style.width = '100%';
      item.style.height = '100%';
      item.style.color = '#e4370e';
      item.style.fontWeight = 'bold';
      item.style.textShadow = '0 1px 1px rgba(255, 255, 255, 0.6)';

      var span = document.createElement('span');
      item.appendChild(span);
      span.style.position = 'relative';
      span.style.display = 'block';
      span.style.paddingTop = '20px';
      span.style.transformOrigin = '50% ' + this._configs.width / 2 + 'px';
      span.style.transform = 'rotate(' + i / this._models.length + 'turn)';
      span.style.textAlign = 'center';
      span.style.fontSize = '2rem';
      span.textContent = (i + 1);
    }

    if (!this._domCanvas) return;

    var models = this._models;
    var configs = this._configs;
    var ctx = this._domCanvas.getContext('2d');
    ctx.clearRect(0, 0, configs.width, configs.height);
    for (var i = 0; i< models.length; i++) {
      ctx.save();
      ctx.beginPath();
      ctx.translate(configs.width / 2, configs.height / 2);
      ctx.moveTo(0, 0);
      ctx.rotate((360 / models.length * i - (360 / models.length / 2 + 90)) * Math.PI / 180);
      ctx.arc(0, 0, configs.width / 2, 0, 2 * Math.PI / models.length, false);
      ctx.fillStyle = Lottery.randomColor();
      ctx.fill();
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'white';
      ctx.stroke();
      ctx.restore();
    }
  };

  Lottery.prototype.onRunLottery = function(rotation) {
    if (!this._domCanvasContainer) return;
    if (this.isRunning) return;
    this.isRunning = true;

    function whichTransitionEvent(){
      var t;
      var el = document.createElement('fakeelement');
      var transitions = {
        'WebkitTransition' :'webkitTransitionEnd',
        'MozTransition'    :'transitionend',
        'MSTransition'     :'msTransitionEnd',
        'OTransition'      :'oTransitionEnd',
        'transition'       :'transitionEnd'
      }

      for(t in transitions){
        if( el.style[t] !== undefined ){
          return transitions[t];
        }
      }
    }

    var that = this;
    this.onTransitionEnd = function() {
      if (!that.isRunning) return;
      that.isRunning = false;
      if (that.onTransitionEnd) {
        that._domCanvasContainer.removeEventListener(whichTransitionEvent(), that.onTransitionEnd);
        that.onTransitionEnd = null;
      }
      // callback
      if (that._whenDone) that._whenDone(that.hitIndex);
    };
    this._domCanvasContainer.addEventListener(whichTransitionEvent(), this.onTransitionEnd, false);

    this._domCanvasContainer.style.transform = 'rotate(' + rotation + 'deg)';
    setTimeout(function(){
      if (that.onTransitionEnd) that.onTransitionEnd();
    }, 3500);
  };

  // Inject Lottery to rendered dom tree node. Like a <DIV/>
  Lottery.prototype.inject = function(container) {
    if (!container) return;
    if (!this._domRootSection) return;
    container.appendChild(this._domRootSection);
  };

  // clobber to window(window)
  window.Lottery = Lottery;
})(window, document);
