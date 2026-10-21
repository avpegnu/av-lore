
  (function () {
    'use strict';

    /* Dữ liệu XOR cố định: lớp 1 ở góc dưới-trái và trên-phải,
       lớp 0 ở góc trên-trái và dưới-phải. Không đường thẳng nào tách được. */
    var DATA = [];
    (function build() {
      var blobs = [
        [0.25, 0.25, 1], [0.75, 0.75, 1],
        [0.25, 0.75, 0], [0.75, 0.25, 0]
      ];
      // Nhiễu cố định, không dùng Math.random để kết quả tái lập được
      var jit = [
        [ 0.00,  0.00], [ 0.08, -0.05], [-0.07,  0.06], [ 0.05,  0.09],
        [-0.09, -0.04], [ 0.11,  0.03], [-0.04, -0.10], [ 0.03, -0.08],
        [-0.11,  0.02], [ 0.07,  0.07]
      ];
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

    /* ---------- Hồi quy logistic (gradient descent) ---------- */
    function trainLogistic(data, iters, lr) {
      var w0 = 0, w1 = 0, b = 0;
      for (var it = 0; it < iters; it++) {
        var g0 = 0, g1 = 0, gb = 0;
        data.forEach(function (p) {
          var z = w0 * p[0] + w1 * p[1] + b;
          var pred = 1 / (1 + Math.exp(-z));
          var err = pred - p[2];
          g0 += err * p[0]; g1 += err * p[1]; gb += err;
        });
        var n = data.length;
        w0 -= lr * g0 / n; w1 -= lr * g1 / n; b -= lr * gb / n;
      }
      return function (x, y) { return 1 / (1 + Math.exp(-(w0 * x + w1 * y + b))) >= 0.5 ? 1 : 0; };
    }

    /* ---------- Cây quyết định (greedy, chia theo Gini) ---------- */
    function gini(rows) {
      if (!rows.length) return 0;
      var p = rows.reduce(function (s, r) { return s + r[2]; }, 0) / rows.length;
      return 1 - p * p - (1 - p) * (1 - p);
    }

    function buildTree(rows, depth) {
      var majority = rows.reduce(function (s, r) { return s + r[2]; }, 0) * 2 >= rows.length ? 1 : 0;
      if (depth === 0 || rows.length < 4 || gini(rows) === 0) {
        return { leaf: true, cls: majority };
      }
      var best = null;
      [0, 1].forEach(function (feat) {
        for (var t = 0.05; t < 1; t += 0.05) {
          var L = rows.filter(function (r) { return r[feat] <= t; });
          var R = rows.filter(function (r) { return r[feat] > t; });
          if (!L.length || !R.length) continue;
          var score = (L.length * gini(L) + R.length * gini(R)) / rows.length;
          if (!best || score < best.score) best = { feat: feat, t: t, score: score, L: L, R: R };
        }
      });
      if (!best) return { leaf: true, cls: majority };
      return {
        leaf: false, feat: best.feat, t: best.t,
        left: buildTree(best.L, depth - 1),
        right: buildTree(best.R, depth - 1)
      };
    }

    function treePredict(node, x, y) {
      while (!node.leaf) {
        var v = node.feat === 0 ? x : y;
        node = v <= node.t ? node.left : node.right;
      }
      return node.cls;
    }

    /* ---------- k-NN ---------- */
    function knnPredict(data, k, x, y) {
      var d = data.map(function (p) {
        var dx = p[0] - x, dy = p[1] - y;
        return { d: dx * dx + dy * dy, c: p[2] };
      });
      d.sort(function (a, b) { return a.d - b.d; });
      var s = 0;
      for (var i = 0; i < k && i < d.length; i++) s += d[i].c;
      return s * 2 >= Math.min(k, d.length) ? 1 : 0;
    }

    /* ---------- Vẽ ---------- */
    var COL = { 0: '#3c5570', 1: '#a35a2a' };
    var BG  = { 0: 'rgba(60,85,112,0.16)', 1: 'rgba(163,90,42,0.16)' };
    var STEP = 5;

    function draw(canvasId, accId, predict) {
      var cv = document.getElementById(canvasId);
      var ctx = cv.getContext('2d');
      var W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);

      for (var px = 0; px < W; px += STEP) {
        for (var py = 0; py < H; py += STEP) {
          var x = (px + STEP / 2) / W;
          var y = 1 - (py + STEP / 2) / H;
          ctx.fillStyle = BG[predict(x, y)];
          ctx.fillRect(px, py, STEP, STEP);
        }
      }

      var dung = 0;
      DATA.forEach(function (p) {
        if (predict(p[0], p[1]) === p[2]) dung++;
        var cx = p[0] * W, cy = (1 - p[1]) * H;
        ctx.beginPath();
        ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
        ctx.fillStyle = COL[p[2]];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      document.getElementById(accId).textContent =
        (dung / DATA.length * 100).toFixed(1) + '%';
    }

    var logisticFn = trainLogistic(DATA, 4000, 0.9);

    function renderAll() {
      var k = parseInt(document.getElementById('knn-k').value, 10);
      var depth = parseInt(document.getElementById('tree-d').value, 10);
      document.getElementById('knn-k-val').textContent = k;
      document.getElementById('tree-d-val').textContent = depth;

      var tree = buildTree(DATA, depth);

      draw('cv-log', 'acc-log', logisticFn);
      draw('cv-tree', 'acc-tree', function (x, y) { return treePredict(tree, x, y); });
      draw('cv-knn', 'acc-knn', function (x, y) { return knnPredict(DATA, k, x, y); });
    }

    document.getElementById('knn-k').addEventListener('input', renderAll);
    document.getElementById('tree-d').addEventListener('input', renderAll);
    renderAll();
  })();
