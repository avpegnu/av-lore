
  (function () {
    'use strict';

    var TOKENS = ['Cô', 'gái', 'mà', 'tôi', 'gặp', 'hôm qua', 'là', 'bác sĩ'];
    var N = TOKENS.length;

    /* Ba "đầu" với ba mẫu hình chú ý khác nhau. Điểm số được định nghĩa bằng
       hàm, rồi cho qua softmax — nên mỗi hàng luôn tổng đúng bằng 1.         */
    var HEADS = [
      {
        name: 'cú pháp',
        score: function (i, j) {
          var s = -0.45 * Math.abs(i - j);
          // "là" (6) tìm chủ ngữ "gái" (1) — phụ thuộc xa
          if (i === 6 && j === 1) s += 3.4;
          // "bác sĩ" (7) cũng quy chiếu về "gái" (1)
          if (i === 7 && j === 1) s += 2.6;
          // "gặp" (4) tìm chủ ngữ của mệnh đề quan hệ "tôi" (3)
          if (i === 4 && j === 3) s += 2.2;
          // "mà" (2) nối về danh từ đứng trước
          if (i === 2 && j === 1) s += 1.8;
          return s;
        },
        note: 'Đầu này bám <strong>quan hệ cú pháp</strong>. Nhìn hàng <code>là</code>: nó dồn ' +
              'phần lớn chú ý vào <code>gái</code> — cách đó năm token — để biết chia động từ theo ' +
              'chủ ngữ nào. <strong>Đây chính xác là thứ RNN không làm được</strong> (chương 9, giới ' +
              'hạn 2): với attention, khoảng cách đó chỉ là một bước.'
      },
      {
        name: 'liền kề',
        score: function (i, j) { return -1.9 * Math.abs(i - j); },
        note: 'Đầu này chỉ chú ý <strong>token ngay trước</strong> — một mẫu hình rất phổ biến ' +
              'trong mô hình thật. Nó nắm thông tin cục bộ: cụm từ, hình thái, trật tự từ. ' +
              'Kết hợp với đầu cú pháp ở trên, mô hình có cả góc nhìn gần lẫn góc nhìn xa — ' +
              'đó là lý do cần multi-head.'
      },
      {
        name: 'neo đầu câu',
        score: function (i, j) { return j === 0 ? 2.2 : -0.35 * Math.abs(i - j); },
        note: 'Đầu này gần như luôn neo về <strong>token đầu chuỗi</strong>. Mẫu hình này xuất hiện ' +
              'rất thường xuyên trong mô hình thật và được gọi là <em>attention sink</em>. ' +
              'Cách hiểu phổ biến: khi một đầu không có gì đặc biệt để chú ý ở lượt này, nó cần ' +
              'một chỗ "đổ" xác suất — vì softmax bắt buộc tổng phải bằng 1.'
      }
    ];

    var elSel   = document.getElementById('attn-head');
    var elMask  = document.getElementById('attn-mask');
    var elTable = document.getElementById('attn-table');
    var elNote  = document.getElementById('attn-note');

    function computeWeights(head, causal) {
      var W = [];
      for (var i = 0; i < N; i++) {
        var scores = [], maxS = -Infinity;
        for (var j = 0; j < N; j++) {
          var s = (causal && j > i) ? -Infinity : head.score(i, j);
          scores.push(s);
          if (s > maxS) maxS = s;
        }
        var exps = scores.map(function (s) {
          return s === -Infinity ? 0 : Math.exp(s - maxS);
        });
        var sum = exps.reduce(function (a, b) { return a + b; }, 0);
        W.push(exps.map(function (e) { return sum > 0 ? e / sum : 0; }));
      }
      return W;
    }

    function colorFor(v) {
      // 0 → nền giấy, 1 → chàm-tím đậm
      var a = 0.06 + v * 0.82;
      return 'rgba(91, 75, 138, ' + a.toFixed(3) + ')';
    }

    function render() {
      var head = HEADS[parseInt(elSel.value, 10)];
      var causal = elMask.checked;
      var W = computeWeights(head, causal);

      var html = '<tr><th></th>';
      TOKENS.forEach(function (t) { html += '<th>' + t + '</th>'; });
      html += '</tr>';

      for (var i = 0; i < N; i++) {
        html += '<tr><th class="qh">' + TOKENS[i] + '</th>';
        for (var j = 0; j < N; j++) {
          if (causal && j > i) {
            html += '<td class="masked">—</td>';
          } else {
            var v = W[i][j];
            var txt = v >= 0.005 ? v.toFixed(2).slice(1).replace('.', ',') : '';
            var col = v > 0.55 ? '#fff' : '#2b2733';
            html += '<td style="background:' + colorFor(v) + ';color:' + col + '">' +
                    (txt ? '0' + txt : '') + '</td>';
          }
        }
        html += '</tr>';
      }

      elTable.innerHTML = html;

      var extra = causal
        ? ''
        : '<br/><br/><strong>Đã bỏ mặt nạ:</strong> giờ mỗi token nhìn được cả token phía sau. ' +
          'Đây là chế độ của mô hình <em>encoder-only</em> — dùng để hiểu văn bản và tạo embedding ' +
          '(10.3 chương 2). Mô hình <em>sinh</em> văn bản bắt buộc phải che, nếu không đáp án sẽ ' +
          'nằm ngay trong đầu vào.';

      elNote.innerHTML = head.note + extra;
    }

    elSel.addEventListener('change', render);
    elMask.addEventListener('change', render);
    render();
  })();
