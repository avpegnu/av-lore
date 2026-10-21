
  (function () {
    'use strict';

    /* Sinh 600 mẫu cố định bằng PRNG có hạt giống — tái lập được hoàn toàn.
       12% dương tính, hai phân phối điểm chồng lấn một phần.               */
    function makeRng(seed) {
      var s = seed >>> 0;
      return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
    }

    var SAMPLES = (function () {
      var rng = makeRng(20260817);
      var out = [];
      for (var i = 0; i < 600; i++) {
        var duong = rng() < 0.12;
        // Trung bình cộng 3 số ngẫu nhiên → xấp xỉ phân phối chuông
        var noise = (rng() + rng() + rng()) / 3;
        var score = duong ? 0.35 + noise * 0.62 : 0.02 + noise * 0.66;
        out.push({ y: duong ? 1 : 0, p: Math.min(0.99, Math.max(0.01, score)) });
      }
      return out;
    })();

    var thr     = document.getElementById('thr');
    var thrVal  = document.getElementById('thr-val');
    var note    = document.getElementById('thr-note');

    function setBar(id, v) {
      document.getElementById(id).style.width = (v * 100).toFixed(1) + '%';
    }

    function fmt(v) { return isFinite(v) ? v.toFixed(3).replace('.', ',') : '—'; }

    function update() {
      var t = parseFloat(thr.value);
      thrVal.textContent = t.toFixed(2).replace('.', ',');

      var tp = 0, fp = 0, fn = 0, tn = 0;
      SAMPLES.forEach(function (s) {
        var pred = s.p >= t ? 1 : 0;
        if (pred === 1 && s.y === 1) tp++;
        else if (pred === 1 && s.y === 0) fp++;
        else if (pred === 0 && s.y === 1) fn++;
        else tn++;
      });

      document.getElementById('v-tp').textContent = tp;
      document.getElementById('v-fp').textContent = fp;
      document.getElementById('v-fn').textContent = fn;
      document.getElementById('v-tn').textContent = tn;

      var prec = tp + fp > 0 ? tp / (tp + fp) : 0;
      var rec  = tp + fn > 0 ? tp / (tp + fn) : 0;
      var f1   = prec + rec > 0 ? 2 * prec * rec / (prec + rec) : 0;
      var acc  = (tp + tn) / SAMPLES.length;

      document.getElementById('v-prec').textContent = fmt(prec);
      document.getElementById('v-rec').textContent  = fmt(rec);
      document.getElementById('v-f1').textContent   = fmt(f1);
      document.getElementById('v-acc').textContent  = fmt(acc);

      setBar('b-prec', prec);
      setBar('b-rec', rec);
      setBar('b-f1', f1);
      setBar('b-acc', acc);

      var msg;
      if (t <= 0.2) {
        msg = '<strong>Ngưỡng rất thấp.</strong> Mô hình báo dương cho gần như mọi thứ: ' +
              'bắt được hầu hết ca dương (recall cao) nhưng ' + fp + ' báo động giả. ' +
              'Phù hợp khi bỏ sót là thảm hoạ và có bước rà soát phía sau.';
      } else if (t >= 0.8) {
        msg = '<strong>Ngưỡng rất cao.</strong> Mô hình chỉ báo dương khi cực kỳ chắc chắn: ' +
              'cảnh báo rất đáng tin (precision cao) nhưng bỏ sót ' + fn + ' ca. ' +
              'Phù hợp khi báo động giả tốn kém.';
      } else {
        msg = '<strong>Vùng cân bằng.</strong> Để ý accuracy gần như không đổi khi kéo ngưỡng, ' +
              'trong khi precision và recall thay đổi mạnh — đúng như mục 1 đã nói: với dữ liệu ' +
              'mất cân bằng, accuracy không mang thông tin hữu ích.';
      }
      note.innerHTML = msg;
    }

    thr.addEventListener('input', update);
    update();
  })();
