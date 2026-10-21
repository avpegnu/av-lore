
  (function () {
    'use strict';

    /* Dữ liệu cố định (sinh sẵn, không ngẫu nhiên) để kết quả tái lập được.
       Quy luật thật: y ≈ 0.55 + 0.75·sin(2.4x) — cộng nhiễu.                */
    var TRAIN = [
      [0.02, 0.60], [0.10, 0.79], [0.17, 1.02], [0.25, 1.14],
      [0.33, 1.28], [0.40, 1.19], [0.48, 1.06], [0.55, 0.83],
      [0.63, 0.52], [0.70, 0.31], [0.78, 0.02], [0.85, -0.14],
      [0.93, -0.19], [1.00, -0.12]
    ];
    var VAL = [
      [0.06, 0.74], [0.21, 1.01], [0.36, 1.31], [0.51, 0.99],
      [0.66, 0.44], [0.74, 0.20], [0.89, -0.21], [0.97, -0.16]
    ];

    var degInput = document.getElementById('deg');
    var degVal   = document.getElementById('deg-val');
    var svg      = document.getElementById('fit-svg');
    var elTrain  = document.getElementById('loss-train');
    var elVal    = document.getElementById('loss-val');
    var elDiag   = document.getElementById('fit-diag');

    /* --- Khớp đa thức bằng phương trình chuẩn + khử Gauss có chọn trụ --- */
    function polyfit(pts, deg) {
      var n = deg + 1;
      var A = [], b = [];
      for (var i = 0; i < n; i++) {
        A.push(new Array(n).fill(0));
        b.push(0);
      }
      pts.forEach(function (p) {
        var x = p[0], y = p[1];
        var pow = [1];
        for (var k = 1; k <= 2 * deg; k++) pow.push(pow[k - 1] * x);
        for (var r = 0; r < n; r++) {
          for (var c = 0; c < n; c++) A[r][c] += pow[r + c];
          b[r] += pow[r] * y;
        }
      });

      // Khử Gauss với chọn trụ từng phần
      for (var col = 0; col < n; col++) {
        var piv = col;
        for (var r2 = col + 1; r2 < n; r2++) {
          if (Math.abs(A[r2][col]) > Math.abs(A[piv][col])) piv = r2;
        }
        if (Math.abs(A[piv][col]) < 1e-12) return null;   // ma trận suy biến
        var tmp = A[col]; A[col] = A[piv]; A[piv] = tmp;
        var tb = b[col];  b[col] = b[piv];  b[piv] = tb;

        for (var r3 = col + 1; r3 < n; r3++) {
          var f = A[r3][col] / A[col][col];
          for (var c3 = col; c3 < n; c3++) A[r3][c3] -= f * A[col][c3];
          b[r3] -= f * b[col];
        }
      }
      var coef = new Array(n).fill(0);
      for (var r4 = n - 1; r4 >= 0; r4--) {
        var s = b[r4];
        for (var c4 = r4 + 1; c4 < n; c4++) s -= A[r4][c4] * coef[c4];
        coef[r4] = s / A[r4][r4];
      }
      return coef;
    }

    function evalPoly(coef, x) {
      var y = 0;
      for (var i = coef.length - 1; i >= 0; i--) y = y * x + coef[i];
      return y;
    }

    function mse(coef, pts) {
      var s = 0;
      pts.forEach(function (p) {
        var d = p[1] - evalPoly(coef, p[0]);
        s += d * d;
      });
      return s / pts.length;
    }

    /* --- Vẽ --- */
    var W = 420, H = 260, PAD = 26;
    var Y_MIN = -0.9, Y_MAX = 1.8;

    function sx(x) { return PAD + x * (W - 2 * PAD); }
    function sy(y) { return H - PAD - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * (H - 2 * PAD); }

    function render(deg) {
      var coef = polyfit(TRAIN, deg);
      if (!coef) {
        elDiag.innerHTML = 'Bậc quá cao so với số điểm dữ liệu — hệ phương trình suy biến.';
        return;
      }

      var lossT = mse(coef, TRAIN);
      var lossV = mse(coef, VAL);

      // Đường cong mô hình, cắt bớt phần vượt khung để không tràn ra ngoài
      var d = '', started = false;
      for (var i = 0; i <= 240; i++) {
        var x = i / 240;
        var y = evalPoly(coef, x);
        if (y < Y_MIN - 0.3 || y > Y_MAX + 0.3) { started = false; continue; }
        var yy = Math.max(Y_MIN, Math.min(Y_MAX, y));
        d += (started ? ' L' : ' M') + sx(x).toFixed(1) + ',' + sy(yy).toFixed(1);
        started = true;
      }

      var parts = [];
      // Lưới ngang
      for (var g = 0; g <= 3; g++) {
        var gy = PAD + g * (H - 2 * PAD) / 3;
        parts.push('<line x1="' + PAD + '" y1="' + gy + '" x2="' + (W - PAD) +
                   '" y2="' + gy + '" stroke="#d8d0c0" stroke-width="1" stroke-dasharray="3 4"/>');
      }
      // Đường cong
      parts.push('<path d="' + d + '" fill="none" stroke="#5b4b8a" stroke-width="2.4" stroke-linejoin="round"/>');
      // Điểm train
      TRAIN.forEach(function (p) {
        parts.push('<circle cx="' + sx(p[0]).toFixed(1) + '" cy="' + sy(p[1]).toFixed(1) +
                   '" r="4" fill="#3c5570"/>');
      });
      // Điểm validation
      VAL.forEach(function (p) {
        parts.push('<rect x="' + (sx(p[0]) - 3.6).toFixed(1) + '" y="' + (sy(p[1]) - 3.6).toFixed(1) +
                   '" width="7.2" height="7.2" fill="#a35a2a" transform="rotate(45 ' +
                   sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1) + ')"/>');
      });

      svg.innerHTML = parts.join('');
      elTrain.textContent = lossT.toFixed(4);
      elVal.textContent   = lossV.toFixed(4);

      var ratio = lossV / Math.max(lossT, 1e-9);
      var msg;
      if (deg <= 1) {
        msg = '<strong>Underfitting.</strong> Một đường thẳng không thể mô tả được quy luật cong ' +
              'của dữ liệu. Cả hai loss đều cao — đây là <em>bias cao</em>.';
      } else if (lossV < 0.02 && ratio < 3) {
        msg = '<strong>Vừa vặn.</strong> Loss thấp trên cả hai tập và khoảng cách nhỏ. ' +
              'Mô hình nắm được quy luật thật mà không học thuộc nhiễu.';
      } else if (ratio > 6) {
        msg = '<strong>Overfitting nặng.</strong> Loss train rất thấp nhưng loss validation cao ' +
              'gấp ' + ratio.toFixed(0) + ' lần. Đường cong uốn éo để đi qua từng điểm huấn luyện — ' +
              'nó đang học thuộc nhiễu. Đây là <em>variance cao</em>.';
      } else if (ratio > 2.5) {
        msg = '<strong>Bắt đầu overfitting.</strong> Khoảng cách giữa hai loss đang nới rộng. ' +
              'Đây là vùng cần dừng lại.';
      } else {
        msg = '<strong>Chấp nhận được.</strong> Thử tăng/giảm bậc để tìm điểm loss validation ' +
              'thấp nhất.';
      }
      elDiag.innerHTML = msg;
    }

    degInput.addEventListener('input', function () {
      degVal.textContent = degInput.value;
      render(parseInt(degInput.value, 10));
    });

    render(parseInt(degInput.value, 10));
  })();
