
  (function () {
    'use strict';

    var STEPS = [
      {
        code: 'optimizer.zero_grad()',
        desc: 'Xoá gradient của bước trước',
        state: { grad: 'None (đã xoá)', w: '0,4210', loss: '—', out: '—' },
        hl: 'grad',
        explain: 'Gradient từ batch trước bị xoá về <code>None</code>. Nếu bỏ bước này, ' +
                 'giá trị cũ vẫn còn và sẽ bị <strong>cộng dồn</strong> với gradient mới ở bước 4 — ' +
                 'khiến hướng cập nhật sai mà không có lỗi nào được báo.'
      },
      {
        code: 'out = model(x)',
        desc: 'Lượt tiến — tính dự đoán',
        state: { grad: 'None', w: '0,4210', loss: '—', out: '0,6317' },
        hl: 'out',
        explain: 'Dữ liệu chảy qua các lớp. PyTorch đồng thời <strong>ghi lại đồ thị tính toán</strong> ' +
                 'để dùng cho lượt lùi. Đây là lý do huấn luyện tốn bộ nhớ hơn suy luận — ' +
                 'và là lý do <code>torch.no_grad()</code> tiết kiệm đáng kể khi chỉ dự đoán.'
      },
      {
        code: 'loss = criterion(out, y)',
        desc: 'Tính mất mát',
        state: { grad: 'None', w: '0,4210', loss: '0,4593', out: '0,6317' },
        hl: 'loss',
        explain: 'So sánh dự đoán với nhãn thật. <code>loss</code> vẫn là một tensor có gắn đồ thị — ' +
                 'đó là lý do phải dùng <code>.item()</code> khi cộng dồn để ghi log, ' +
                 'nếu không sẽ giữ nguyên cả đồ thị trong bộ nhớ.'
      },
      {
        code: 'loss.backward()',
        desc: 'Lượt lùi — điền vào .grad',
        state: { grad: '−0,1284', w: '0,4210', loss: '0,4593', out: '0,6317' },
        hl: 'grad',
        explain: 'Đây là chương 7 được tự động hoá. PyTorch đi ngược đồ thị, áp dụng quy tắc chuỗi, ' +
                 'và điền gradient vào <code>.grad</code> của <em>mọi</em> tham số. ' +
                 '<strong>Trọng số chưa hề thay đổi ở bước này.</strong>'
      },
      {
        code: 'optimizer.step()',
        desc: 'Cập nhật trọng số',
        state: { grad: '−0,1284', w: '0,4338', loss: '0,4593', out: '0,6317' },
        hl: 'w',
        explain: 'Bây giờ trọng số mới thay đổi: <code>w ← w − η·grad</code>. Với η = 0,1: ' +
                 '<code>0,4210 − 0,1×(−0,1284) = 0,4338</code>. ' +
                 'Chú ý <code>.grad</code> vẫn còn nguyên — nó chỉ bị xoá ở bước 1 của vòng lặp sau.'
      },
      {
        code: 'tong_loss += loss.item()',
        desc: 'Ghi lại để theo dõi',
        state: { grad: '−0,1284', w: '0,4338', loss: '0,4593', out: '0,6317' },
        hl: 'loss',
        explain: '<code>.item()</code> lấy ra giá trị số thuần, <strong>tách khỏi đồ thị tính toán</strong>. ' +
                 'Quên nó và cộng thẳng tensor sẽ giữ tham chiếu tới toàn bộ đồ thị của mọi batch — ' +
                 'gây rò rỉ bộ nhớ và hết VRAM sau vài epoch.'
      }
    ];

    var idx = -1;
    var elSteps   = document.getElementById('lp-steps');
    var elState   = document.getElementById('lp-state');
    var elExplain = document.getElementById('lp-explain');

    var LABELS = { out: 'out', loss: 'loss', grad: 'w.grad', w: 'w (trọng số)' };

    function renderSteps() {
      elSteps.innerHTML = STEPS.map(function (s, i) {
        var cls = i === idx ? ' on' : (i < idx ? ' done' : '');
        return '<div class="loop-step' + cls + '">' +
                 '<span class="ls-n">' + (i + 1) + '</span>' +
                 '<span><span class="ls-code">' + s.code + '</span>' +
                 '<span class="ls-desc">' + s.desc + '</span></span>' +
               '</div>';
      }).join('');
    }

    function renderState() {
      var st = idx >= 0
        ? STEPS[idx].state
        : { grad: 'None', w: '0,4210', loss: '—', out: '—' };
      var hl = idx >= 0 ? STEPS[idx].hl : null;

      elState.innerHTML = ['out', 'loss', 'grad', 'w'].map(function (k) {
        var v = st[k];
        var none = (v === '—' || v.indexOf('None') === 0) ? ' none' : '';
        return '<div class="state-row' + (k === hl ? ' hl' : '') + '">' +
                 '<span class="sk">' + LABELS[k] + '</span>' +
                 '<span class="sv' + none + '">' + v + '</span>' +
               '</div>';
      }).join('');
    }

    function render() {
      renderSteps();
      renderState();
      elExplain.innerHTML = idx >= 0
        ? STEPS[idx].explain
        : 'Bấm <strong>“Bước tiếp”</strong> để đi qua từng bước và xem trạng thái bên trong thay đổi thế nào.';
      document.getElementById('lp-next').textContent =
        idx >= STEPS.length - 1 ? '↻ Vòng lặp mới' : 'Bước tiếp →';
    }

    document.getElementById('lp-next').addEventListener('click', function () {
      idx = idx >= STEPS.length - 1 ? 0 : idx + 1;
      render();
    });

    document.getElementById('lp-reset').addEventListener('click', function () {
      idx = -1;
      render();
    });

    render();
  })();
