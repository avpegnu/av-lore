
  (function () {
    'use strict';

    var N = 28;

    /* Ảnh mẫu 28×28: một hình vuông sáng, một dải chéo, và nền có gradient nhẹ.
       Sinh tất định — không dùng số ngẫu nhiên.                                */
    var IMG = (function () {
      var m = [];
      for (var y = 0; y < N; y++) {
        var row = [];
        for (var x = 0; x < N; x++) {
          var v = 40 + (x + y) * 1.2;                  // nền chuyển sắc nhẹ
          if (x >= 4 && x <= 12 && y >= 4 && y <= 12) v = 225;   // hình vuông sáng
          if (Math.abs((x - 6) - (y - 16)) <= 1 && y >= 15) v = 210;  // dải chéo
          if (x >= 17 && x <= 24 && y >= 17 && y <= 24) v = 15;  // hình vuông tối
          row.push(Math.max(0, Math.min(255, v)));
        }
        m.push(row);
      }
      return m;
    })();

    var KERNELS = {
      identity: {
        k: [[0,0,0],[0,1,0],[0,0,0]],
        note: 'Kernel <strong>giữ nguyên</strong>: chỉ số 1 ở giữa, còn lại bằng 0. ' +
              'Mỗi pixel ra bằng đúng pixel vào. Hữu ích để thấy rằng tích chập chỉ là ' +
              'phép nhân có trọng số trên một cửa sổ trượt.'
      },
      blur: {
        k: [[1,1,1],[1,1,1],[1,1,1]], div: 9,
        note: 'Kernel <strong>làm mờ</strong>: lấy trung bình 9 pixel lân cận. ' +
              'Mọi hệ số dương và bằng nhau, tổng bằng 1 sau khi chia — nên độ sáng tổng thể ' +
              'không đổi, chỉ chi tiết bị làm nhoè.'
      },
      edge: {
        k: [[-1,-1,-1],[-1,8,-1],[-1,-1,-1]], bias: 128,
        note: 'Kernel <strong>phát hiện cạnh</strong>: so pixel trung tâm với trung bình lân cận. ' +
              'Ở vùng phẳng, kết quả gần 0 (xám). Ở biên giữa vùng sáng và tối, kết quả lớn — ' +
              'nên chỉ đường viền hiện ra. Tổng hệ số bằng 0, đặc trưng của mọi kernel phát hiện cạnh.'
      },
      sobelx: {
        k: [[1,0,-1],[2,0,-2],[1,0,-1]], bias: 128,
        note: 'Kernel <strong>Sobel X</strong>: so cột trái với cột phải, nên nó bắt <strong>cạnh dọc</strong>. ' +
              'Chú ý hai cạnh dọc của hình vuông hiện rõ còn hai cạnh ngang thì mờ.'
      },
      sobely: {
        k: [[1,2,1],[0,0,0],[-1,-2,-1]], bias: 128,
        note: 'Kernel <strong>Sobel Y</strong>: so hàng trên với hàng dưới, nên nó bắt <strong>cạnh ngang</strong>. ' +
              'Đúng ngược lại với Sobel X — đây là minh hoạ trực tiếp cho việc mỗi kernel học ' +
              'một loại đặc trưng riêng, và vì sao một lớp tích chập cần nhiều kernel.'
      },
      sharpen: {
        k: [[0,-1,0],[-1,5,-1],[0,-1,0]],
        note: 'Kernel <strong>làm nét</strong>: khuếch đại pixel trung tâm và trừ đi lân cận. ' +
              'Tổng hệ số bằng 1 nên độ sáng giữ nguyên, nhưng tương phản ở biên tăng lên.'
      }
    };

    var cvIn  = document.getElementById('conv-in');
    var cvOut = document.getElementById('conv-out');
    var elK   = document.getElementById('conv-kernel');
    var elSel = document.getElementById('conv-k');
    var elNote = document.getElementById('conv-note');

    function drawMatrix(canvas, m) {
      var h = m.length, w = m[0].length;
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      var img = ctx.createImageData(w, h);
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var v = Math.max(0, Math.min(255, Math.round(m[y][x])));
          var i = (y * w + x) * 4;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }

    function convolve(src, k, div, bias) {
      div = div || 1;
      bias = bias || 0;
      var h = src.length, w = src[0].length;
      var out = [];
      for (var y = 1; y < h - 1; y++) {
        var row = [];
        for (var x = 1; x < w - 1; x++) {
          var s = 0;
          for (var ky = -1; ky <= 1; ky++) {
            for (var kx = -1; kx <= 1; kx++) {
              s += src[y + ky][x + kx] * k[ky + 1][kx + 1];
            }
          }
          row.push(s / div + bias);
        }
        out.push(row);
      }
      return out;
    }

    function renderKernel(k, div) {
      elK.innerHTML = k.map(function (row) {
        return row.map(function (v) {
          var cls = v > 0 ? 'pos' : (v < 0 ? 'neg' : '');
          var txt = div && div !== 1 ? v + '/' + div : String(v);
          return '<div class="' + cls + '">' + txt + '</div>';
        }).join('');
      }).join('');
    }

    function update() {
      var cfg = KERNELS[elSel.value];
      renderKernel(cfg.k, cfg.div);
      drawMatrix(cvIn, IMG);
      drawMatrix(cvOut, convolve(IMG, cfg.k, cfg.div, cfg.bias));
      elNote.innerHTML = cfg.note;
    }

    elSel.addEventListener('change', update);
    update();
  })();
