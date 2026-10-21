
  (function () {
    'use strict';

    var inA = document.getElementById('bc-a');
    var inB = document.getElementById('bc-b');
    var out = document.getElementById('bc-result');

    function parseShape(s) {
      var parts = s.split(',')
        .map(function (x) { return x.trim(); })
        .filter(function (x) { return x.length > 0; })
        .map(function (x) { return parseInt(x, 10); });
      return parts.some(isNaN) || parts.some(function (n) { return n < 1; }) ? null : parts;
    }

    function cell(text, cls) {
      return '<span class="bc-dim' + (cls ? ' ' + cls : '') + '">' + text + '</span>';
    }

    function update() {
      var A = parseShape(inA.value);
      var B = parseShape(inB.value);

      if (!A || !B || A.length === 0 || B.length === 0) {
        out.className = 'bc-result';
        out.innerHTML = '<div class="bc-verdict">Nhập shape dạng số nguyên dương cách nhau ' +
          'bởi dấu phẩy — ví dụ <code>3,4</code> hoặc <code>5</code>.</div>';
        return;
      }

      var n = Math.max(A.length, B.length);
      // Căn phải: đệm 1 vào bên trái cho shape ngắn hơn
      var pa = new Array(n - A.length).fill(null).concat(A);
      var pb = new Array(n - B.length).fill(null).concat(B);

      var res = [], ok = true, firstBad = -1;
      for (var i = 0; i < n; i++) {
        var x = pa[i] === null ? 1 : pa[i];
        var y = pb[i] === null ? 1 : pb[i];
        if (x === y || x === 1 || y === 1) {
          res.push(Math.max(x, y));
        } else {
          ok = false;
          if (firstBad < 0) firstBad = i;
          res.push('✗');
        }
      }

      var rowA = 'A : ' + pa.map(function (v, i) {
        var bad = !ok && i === firstBad;
        return cell(v === null ? '·' : v, v === null ? 'pad' : (bad ? 'bad' : 'ok'));
      }).join('');

      var rowB = 'B : ' + pb.map(function (v, i) {
        var bad = !ok && i === firstBad;
        return cell(v === null ? '·' : v, v === null ? 'pad' : (bad ? 'bad' : 'ok'));
      }).join('');

      var rowR = ok
        ? '→   ' + res.map(function (v) { return cell(v, 'ok'); }).join('')
        : '→   ' + cell('lỗi', 'bad');

      var verdict;
      if (ok) {
        verdict = 'Hợp lệ. Kết quả có shape <strong>(' + res.join(', ') + ')</strong>. ' +
          'Mỗi chiều lấy giá trị lớn hơn; chiều bằng 1 được lặp lại cho khớp.';
      } else {
        verdict = 'Không broadcast được. Tại vị trí đánh dấu, hai chiều là <strong>' +
          (pa[firstBad] === null ? 1 : pa[firstBad]) + '</strong> và <strong>' +
          (pb[firstBad] === null ? 1 : pb[firstBad]) +
          '</strong> — chúng khác nhau và không có bên nào bằng 1. ' +
          'Cách sửa thường gặp: thêm một chiều kích thước 1 bằng <code>keepdims=True</code> ' +
          'hoặc <code>.reshape(...)</code>.';
      }

      out.className = 'bc-result ' + (ok ? 'ok' : 'bad');
      out.innerHTML =
        '<div class="bc-align">' +
          '<div class="bc-row">' + rowA + '</div>' +
          '<div class="bc-row">' + rowB + '</div>' +
          '<div class="bc-row">' + rowR + '</div>' +
        '</div>' +
        '<div class="bc-verdict">' + verdict + '</div>';
    }

    inA.addEventListener('input', update);
    inB.addEventListener('input', update);

    document.querySelectorAll('.bc-presets button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        inA.value = btn.dataset.a;
        inB.value = btn.dataset.b;
        update();
      });
    });

    update();
  })();
