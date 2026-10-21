
  (function () {
    'use strict';

    /* ---------- Dữ liệu XOR cố định (giống chương 5) ---------- */
    var DATA = [];
    (function build() {
      var blobs = [[0.25,0.25,1],[0.75,0.75,1],[0.25,0.75,0],[0.75,0.25,0]];
      var jit = [[0,0],[0.08,-0.05],[-0.07,0.06],[0.05,0.09],[-0.09,-0.04],
                 [0.11,0.03],[-0.04,-0.10],[0.03,-0.08],[-0.11,0.02],[0.07,0.07]];
      blobs.forEach(function (b) {
        jit.forEach(function (j) {
          DATA.push([
            Math.min(0.97, Math.max(0.03, b[0] + j[0])),
            Math.min(0.97, Math.max(0.03, b[1] + j[1])),
            b[2]
          ]);
        });
      });
    })();

    /* ---------- PRNG có hạt giống để khởi tạo tái lập được ---------- */
    function makeRng(seed) {
      var s = seed >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296 * 2 - 1;   // (-1, 1)
      };
    }

    /* ---------- Mạng 2 → H → 1 ---------- */
    var net = null, timer = null, lossHist = [];

    function initNet(H, actName) {
      var rng = makeRng(7);
      var scale = Math.sqrt(2 / 2);   // khởi tạo kiểu He cho lớp đầu
      var W1 = [], b1 = [];
      for (var i = 0; i < H; i++) {
        W1.push([rng() * scale, rng() * scale]);
        b1.push(0);
      }
      var W2 = [], b2 = 0;
      for (var j = 0; j < H; j++) W2.push(rng() * Math.sqrt(2 / H));
      return { H: H, W1: W1, b1: b1, W2: W2, b2: b2, act: actName };
    }

    function actFn(name, z) {
      if (name === 'relu') return z > 0 ? z : 0;
      if (name === 'tanh') return Math.tanh(z);
      return z;                          // tuyến tính — không có phi tuyến
    }
    function actDeriv(name, z, a) {
      if (name === 'relu') return z > 0 ? 1 : 0;
      if (name === 'tanh') return 1 - a * a;
      return 1;
    }

    function forward(n, x1, x2) {
      var z1 = [], a1 = [];
      for (var i = 0; i < n.H; i++) {
        var z = n.W1[i][0] * x1 + n.W1[i][1] * x2 + n.b1[i];
        z1.push(z);
        a1.push(actFn(n.act, z));
      }
      var z2 = n.b2;
      for (var j = 0; j < n.H; j++) z2 += n.W2[j] * a1[j];
      var yhat = 1 / (1 + Math.exp(-z2));
      return { z1: z1, a1: a1, yhat: yhat };
    }

    function trainEpoch(n, lr) {
      var gW1 = [], gb1 = new Array(n.H).fill(0);
      for (var i = 0; i < n.H; i++) gW1.push([0, 0]);
      var gW2 = new Array(n.H).fill(0), gb2 = 0;
      var loss = 0, dung = 0;

      DATA.forEach(function (p) {
        var f = forward(n, p[0], p[1]);
        var y = p[2];
        var eps = 1e-9;
        loss += -(y * Math.log(f.yhat + eps) + (1 - y) * Math.log(1 - f.yhat + eps));
        if ((f.yhat >= 0.5 ? 1 : 0) === y) dung++;

        var dz2 = f.yhat - y;            // sigmoid + BCE → rút gọn đẹp
        gb2 += dz2;
        for (var j = 0; j < n.H; j++) {
          gW2[j] += dz2 * f.a1[j];
          var da1 = dz2 * n.W2[j];
          var dz1 = da1 * actDeriv(n.act, f.z1[j], f.a1[j]);
          gW1[j][0] += dz1 * p[0];
          gW1[j][1] += dz1 * p[1];
          gb1[j] += dz1;
        }
      });

      var m = DATA.length;
      for (var k = 0; k < n.H; k++) {
        n.W1[k][0] -= lr * gW1[k][0] / m;
        n.W1[k][1] -= lr * gW1[k][1] / m;
        n.b1[k]    -= lr * gb1[k] / m;
        n.W2[k]    -= lr * gW2[k] / m;
      }
      n.b2 -= lr * gb2 / m;

      return { loss: loss / m, acc: dung / m };
    }

    /* ---------- Vẽ ---------- */
    var cv = document.getElementById('nn-cv');
    var ctx = cv.getContext('2d');
    var STEP = 6;

    function draw(n) {
      var W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      for (var px = 0; px < W; px += STEP) {
        for (var py = 0; py < H; py += STEP) {
          var x = (px + STEP / 2) / W;
          var y = 1 - (py + STEP / 2) / H;
          var p = forward(n, x, y).yhat;
          ctx.fillStyle = p >= 0.5
            ? 'rgba(163,90,42,' + (0.08 + (p - 0.5) * 0.5).toFixed(3) + ')'
            : 'rgba(60,85,112,' + (0.08 + (0.5 - p) * 0.5).toFixed(3) + ')';
          ctx.fillRect(px, py, STEP, STEP);
        }
      }
      DATA.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p[0] * W, (1 - p[1]) * H, 4.2, 0, Math.PI * 2);
        ctx.fillStyle = p[2] === 1 ? '#a35a2a' : '#3c5570';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });
    }

    function drawLoss() {
      var svg = document.getElementById('nn-loss-svg');
      if (lossHist.length < 2) { svg.innerHTML = ''; return; }
      var mx = Math.max.apply(null, lossHist);
      var mn = Math.min.apply(null, lossHist);
      var rng = Math.max(1e-6, mx - mn);
      var pts = lossHist.map(function (v, i) {
        var x = (i / (lossHist.length - 1)) * 196 + 2;
        var y = 80 - ((v - mn) / rng) * 72;
        return x.toFixed(1) + ',' + y.toFixed(1);
      }).join(' ');
      svg.innerHTML =
        '<polyline points="' + pts + '" fill="none" stroke="#5b4b8a" stroke-width="1.8" ' +
        'vector-effect="non-scaling-stroke"/>';
    }

    /* ---------- Điều khiển ---------- */
    var elHidden = document.getElementById('nn-hidden');
    var elLr     = document.getElementById('nn-lr');
    var elAct    = document.getElementById('nn-act');
    var elEpoch  = document.getElementById('nn-epoch');
    var elLoss   = document.getElementById('nn-loss');
    var elAcc    = document.getElementById('nn-acc');
    var elDiag   = document.getElementById('nn-diag');
    var btnRun   = document.getElementById('nn-run');

    var epoch = 0, running = false;

    function reset() {
      stop();
      epoch = 0;
      lossHist = [];
      net = initNet(parseInt(elHidden.value, 10), elAct.value);
      elEpoch.textContent = '0';
      elLoss.textContent = '—';
      elAcc.textContent = '—';
      elDiag.textContent = 'Bấm “Huấn luyện” để bắt đầu.';
      draw(net);
      drawLoss();
    }

    function stop() {
      running = false;
      if (timer) { clearInterval(timer); timer = null; }
      btnRun.textContent = '▶ Huấn luyện';
    }

    function diagnose(loss, acc, lr) {
      if (!isFinite(loss)) {
        return '<strong>Phân kỳ.</strong> Loss thành NaN — learning rate quá lớn. Giảm mạnh rồi đặt lại.';
      }
      if (elAct.value === 'none') {
        return '<strong>Không có hàm phi tuyến.</strong> Mạng này tương đương một lớp tuyến tính, ' +
               'nên không bao giờ tách được dữ liệu XOR — độ chính xác sẽ mắc kẹt quanh 50%. ' +
               'Đây chính là chứng minh ở mục 2.';
      }
      if (lr > 2 && lossHist.length > 20) {
        var recent = lossHist.slice(-10);
        var dao = Math.max.apply(null, recent) - Math.min.apply(null, recent);
        if (dao > 0.05) {
          return '<strong>Learning rate hơi lớn.</strong> Loss dao động thay vì giảm mượt. ' +
                 'Giảm xuống khoảng 0,5 để thấy khác biệt.';
        }
      }
      if (acc >= 0.98) return '<strong>Đã học xong.</strong> Mạng tách được XOR — điều mà một lớp tuyến tính không làm nổi.';
      if (acc >= 0.85) return '<strong>Đang học tốt.</strong> Ranh giới quyết định đang hình thành quanh các cụm.';
      if (epoch > 300 && acc < 0.7) {
        return '<strong>Học chậm.</strong> Thử tăng learning rate, hoặc tăng số nơ-ron lớp ẩn.';
      }
      return '<strong>Đang huấn luyện…</strong> Quan sát ranh giới quyết định biến đổi qua từng epoch.';
    }

    function step() {
      var lr = parseFloat(elLr.value);
      for (var i = 0; i < 4; i++) {          // 4 epoch mỗi khung hình
        var r = trainEpoch(net, lr);
        epoch++;
        if (epoch % 2 === 0) lossHist.push(r.loss);
        if (lossHist.length > 100) lossHist.shift();
      }
      var last = trainEpoch(net, 0);          // đo mà không cập nhật (lr = 0)
      elEpoch.textContent = epoch;
      elLoss.textContent = isFinite(last.loss) ? last.loss.toFixed(4) : 'NaN';
      elAcc.textContent = (last.acc * 100).toFixed(1) + '%';
      elDiag.innerHTML = diagnose(last.loss, last.acc, lr);
      draw(net);
      drawLoss();
      if (epoch >= 1200 || !isFinite(last.loss)) stop();
    }

    btnRun.addEventListener('click', function () {
      if (running) { stop(); return; }
      if (!net) reset();
      running = true;
      btnRun.textContent = '⏸ Tạm dừng';
      timer = setInterval(step, 60);
    });

    document.getElementById('nn-reset').addEventListener('click', reset);

    elHidden.addEventListener('input', function () {
      document.getElementById('nn-hidden-val').textContent = elHidden.value;
      reset();
    });
    elLr.addEventListener('input', function () {
      document.getElementById('nn-lr-val').textContent =
        parseFloat(elLr.value).toFixed(2).replace('.', ',');
    });
    elAct.addEventListener('change', reset);

    reset();
  })();
