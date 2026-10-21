
  (function () {
    'use strict';

    /* ---------- Máy tính cosine similarity ---------- */
    var ids = ['a0','a1','a2','b0','b1','b2'];
    var els = {};
    ids.forEach(function (id) { els[id] = document.getElementById(id); });

    function fmt(x, d) { return Number(x).toFixed(d === undefined ? 3 : d); }

    function updateCosine() {
      var a = [+els.a0.value || 0, +els.a1.value || 0, +els.a2.value || 0];
      var b = [+els.b0.value || 0, +els.b1.value || 0, +els.b2.value || 0];

      var dot = a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
      var na = Math.sqrt(a[0]*a[0] + a[1]*a[1] + a[2]*a[2]);
      var nb = Math.sqrt(b[0]*b[0] + b[1]*b[1] + b[2]*b[2]);

      document.getElementById('out-dot').textContent = fmt(dot, 2);
      document.getElementById('out-na').textContent  = fmt(na);
      document.getElementById('out-nb').textContent  = fmt(nb);

      var verdict = document.getElementById('cos-verdict');

      if (na === 0 || nb === 0) {
        document.getElementById('out-cos').textContent = '—';
        document.getElementById('out-ang').textContent = '—';
        verdict.innerHTML = 'Vector không (mọi thành phần bằng 0) <strong>không có hướng</strong>, ' +
          'nên cosine không xác định — mẫu số bằng 0. Trong thực tế, embedding của một chuỗi rỗng ' +
          'là ca biên cần chặn trước khi đưa vào tìm kiếm.';
        return;
      }

      var cos = dot / (na * nb);
      cos = Math.max(-1, Math.min(1, cos));           // chặn sai số dấu phẩy động
      var ang = Math.acos(cos) * 180 / Math.PI;

      document.getElementById('out-cos').textContent = fmt(cos);
      document.getElementById('out-ang').textContent = fmt(ang, 1) + '°';

      var msg;
      if (cos > 0.98)       msg = '<strong>Gần như cùng hướng.</strong> Trong tìm kiếm ngữ nghĩa, đây là mức của hai đoạn văn nói cùng một điều.';
      else if (cos > 0.7)   msg = '<strong>Rất liên quan.</strong> Cùng chủ đề, khác cách diễn đạt.';
      else if (cos > 0.3)   msg = '<strong>Có liên quan phần nào.</strong> Chung một lĩnh vực nhưng không cùng nội dung.';
      else if (cos > -0.1)  msg = '<strong>Gần như không liên quan.</strong> Cosine quanh 0 nghĩa là hai vector gần vuông góc.';
      else                  msg = '<strong>Ngược hướng.</strong> Hiếm gặp với embedding văn bản thật, vì các mô hình hiện đại hầu như không tạo ra vector đối nhau.';

      verdict.innerHTML = msg;
    }

    ids.forEach(function (id) { els[id].addEventListener('input', updateCosine); });

    document.querySelectorAll('.preset-row button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = btn.dataset.a.split(',');
        var b = btn.dataset.b.split(',');
        els.a0.value = a[0]; els.a1.value = a[1]; els.a2.value = a[2];
        els.b0.value = b[0]; els.b1.value = b[1]; els.b2.value = b[2];
        updateCosine();
      });
    });

    document.getElementById('cos-reset').addEventListener('click', function () {
      els.a0.value = 1; els.a1.value = 2; els.a2.value = 3;
      els.b0.value = 4; els.b1.value = 5; els.b2.value = 6;
      updateCosine();
    });

    updateCosine();

    /* ---------- Softmax + temperature ---------- */
    var logitsInput = document.getElementById('sm-logits');
    var tempInput   = document.getElementById('sm-temp');
    var tempVal     = document.getElementById('sm-temp-val');
    var demo        = document.getElementById('sm-demo');
    var smNote      = document.getElementById('sm-note');

    function softmax(xs, T) {
      var scaled = xs.map(function (x) { return x / T; });
      var mx = Math.max.apply(null, scaled);
      var exps = scaled.map(function (x) { return Math.exp(x - mx); });  // trừ max, tránh tràn số
      var sum = exps.reduce(function (s, e) { return s + e; }, 0);
      return exps.map(function (e) { return e / sum; });
    }

    function updateSoftmax() {
      var raw = logitsInput.value.split(',')
        .map(function (s) { return parseFloat(s.trim()); })
        .filter(function (x) { return !isNaN(x); });

      var T = parseFloat(tempInput.value);
      tempVal.textContent = T.toFixed(1);

      if (raw.length < 2) {
        demo.innerHTML = '';
        smNote.textContent = 'Nhập ít nhất hai số, cách nhau bởi dấu phẩy.';
        return;
      }

      var probs = softmax(raw, T);
      var maxP = Math.max.apply(null, probs);

      demo.innerHTML = probs.map(function (p, i) {
        var h = Math.max(2, (p / maxP) * 100);
        return '<div class="sm-col">' +
                 '<div class="sm-val">' + (p * 100).toFixed(1) + '%</div>' +
                 '<div class="sm-bar" style="height:' + h + '%"></div>' +
                 '<div class="sm-lbl">' + raw[i] + '</div>' +
               '</div>';
      }).join('');

      var top = maxP * 100;
      var note;
      if (T <= 0.4)      note = 'Temperature rất thấp: phân phối gần như one-hot (' + top.toFixed(0) + '% cho token mạnh nhất). Đầu ra sẽ lặp lại và rất ổn định — phù hợp cho trích xuất dữ liệu, phân loại.';
      else if (T <= 1.1) note = 'Temperature quanh mặc định: token mạnh nhất chiếm ' + top.toFixed(0) + '%, các token khác vẫn có cơ hội. Đây là vùng cân bằng cho phần lớn ứng dụng.';
      else               note = 'Temperature cao: phân phối phẳng (' + top.toFixed(0) + '% cho token mạnh nhất). Đầu ra đa dạng hơn nhưng dễ lệch chủ đề và dễ sai — cân nhắc kỹ trước khi dùng trong production.';
      smNote.innerHTML = note;
    }

    logitsInput.addEventListener('input', updateSoftmax);
    tempInput.addEventListener('input', updateSoftmax);
    updateSoftmax();
  })();
