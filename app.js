'use strict';

// TRANSLATIONS is defined in language.js

angular.module('milkCalc', [])
  .controller('CalcCtrl', ['$scope', function ($scope) {

    function parseLocalDate(val) {
      if (val instanceof Date) {
        return new Date(val.getFullYear(), val.getMonth(), val.getDate());
      }
      var p = String(val).split('-');
      return new Date(+p[0], +p[1] - 1, +p[2]);
    }

    function formatDate(d, t) {
      var dd = d.getDate();
      return (dd < 10 ? '0' + dd : '' + dd) + ' ' + t.months[d.getMonth()];
    }

    function formatYear(d) {
      return d.getFullYear();
    }

    // ── State ────────────────────────────────────────────────────────────────
    $scope.lang = 'en';
    $scope.t = TRANSLATIONS['en'];
    $scope.phase = 'form';
    $scope.errors = {};
    $scope.canShare = !!(navigator.canShare && navigator.share);
    $scope.currentYear = function () { return new Date().getFullYear(); };

    $scope.shareApp = function () {
      if (!navigator.share) return;
      navigator.share({
        title: 'Milk Price Calculator',
        text: 'Calculate milk prices easily with this free app!',
        url: window.location.href
      });
    };

    var STORAGE_KEY = 'milkCalcForm';

    function loadSavedForm() {
      try {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved) {
          if (saved.startDate) saved.startDate = parseLocalDate(String(saved.startDate).slice(0, 10));
          if (saved.endDate) saved.endDate = parseLocalDate(String(saved.endDate).slice(0, 10));
          return saved;
        }
      } catch (e) { }
      return { startDate: '', endDate: '', price: null, defaultMilk: null, buyerName: '' };
    }

    $scope.form = loadSavedForm();
    $scope.rows = [];

    var _shareFile = null;

    // ── Language ─────────────────────────────────────────────────────────────
    $scope.langs = [
      { code: 'en', label: 'English', flag: '🇬🇧' },
      { code: 'hi', label: 'हिंदी', flag: '🇮🇳' }
    ];

    $scope.setLang = function (code) {
      $scope.lang = code;
      $scope.t = TRANSLATIONS[code];
      $scope.rows.forEach(function (row) {
        row.dayStr = $scope.t.days[row.dateObj.getDay()];
        row.dateStr = formatDate(row.dateObj, $scope.t);
      });
    };

    $scope.currentLang = function () {
      return $scope.langs.find(function (l) { return l.code === $scope.lang; });
    };

    // ── Validation ───────────────────────────────────────────────────────────
    $scope.validate = function () {
      $scope.errors = {};
      var t = $scope.t;

      if (!$scope.form.startDate) $scope.errors.startDate = t.errorRequired;
      if (!$scope.form.endDate) $scope.errors.endDate = t.errorRequired;

      if ($scope.form.startDate && $scope.form.endDate) {
        var s = parseLocalDate($scope.form.startDate);
        var e = parseLocalDate($scope.form.endDate);
        if (e < s) {
          $scope.errors.dateRange = t.endBeforeStart;
        } else {
          var days = Math.round((e - s) / 86400000) + 1;
          if (days > 31) $scope.errors.dateRange = t.rangeError;
        }
      }
      if (!$scope.form.price || +$scope.form.price <= 0) $scope.errors.price = t.errorPositive;
      if (!$scope.form.defaultMilk || +$scope.form.defaultMilk <= 0) $scope.errors.defaultMilk = t.errorPositive;

      return Object.keys($scope.errors).length === 0;
    };

    // ── Generate ─────────────────────────────────────────────────────────────
    $scope.generate = function () {
      if (!$scope.validate()) return;

      var t = $scope.t;
      var start = parseLocalDate($scope.form.startDate);
      var end = parseLocalDate($scope.form.endDate);
      var rows = [];
      var cur = new Date(start);
      var idx = 1;

      while (cur <= end) {
        rows.push({
          no: idx++,
          dateObj: new Date(cur),
          dateStr: formatDate(cur, t),
          yearStr: formatYear(cur),
          dayStr: t.days[cur.getDay()],
          milk: parseFloat($scope.form.defaultMilk),
          remark: ''
        });
        cur.setDate(cur.getDate() + 1);
      }

      $scope.rows = rows;
      $scope.phase = 'table';
      try {
        var toSave = {
          startDate: fileDate($scope.form.startDate),
          endDate: fileDate($scope.form.endDate),
          price: $scope.form.price,
          defaultMilk: $scope.form.defaultMilk,
          buyerName: $scope.form.buyerName
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) { }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Row class ─────────────────────────────────────────────────────────────
    $scope.rowClass = function (row) {
      var qty = parseFloat(row.milk);
      var def = parseFloat($scope.form.defaultMilk);
      if (isNaN(qty) || isNaN(def)) return '';
      if (qty > def) return 'row-more';
      if (qty < def) return 'row-less';
      return '';
    };

    // ── Totals ────────────────────────────────────────────────────────────────
    $scope.totalMilk = function () {
      return $scope.rows.reduce(function (s, r) { return s + (parseFloat(r.milk) || 0); }, 0);
    };

    $scope.totalAmount = function () {
      return $scope.totalMilk() * ($scope.form.price || 0);
    };

    $scope.formatINR = function (amount) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', minimumFractionDigits: 2
      }).format(amount);
    };

    // ── Print date range ──────────────────────────────────────────────────────
    $scope.printDateRange = function () {
      if (!$scope.form.startDate || !$scope.form.endDate) return '';
      var s = parseLocalDate($scope.form.startDate);
      var e = parseLocalDate($scope.form.endDate);
      return formatDate(s, $scope.t) + ' – ' + formatDate(e, $scope.t) + ' ' + formatYear(e);
    };

    // ── Actions ───────────────────────────────────────────────────────────────
    $scope.printPage = function () {
      var prev = document.title;
      document.title = buildFileName('pdf').replace('.pdf', '');
      window.print();
      document.title = prev;
    };

    function fileDate(d) {
      if (!d) return '';
      if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      var date = (d instanceof Date) ? d : parseLocalDate(d);
      var y = date.getFullYear();
      var m = String(date.getMonth() + 1).padStart(2, '0');
      var day = String(date.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }

    function buildFileName(ext) {
      var parts = [];
      if ($scope.form.buyerName) parts.push($scope.form.buyerName.trim().replace(/\s+/g, '-'));
      var s = fileDate($scope.form.startDate);
      var e = fileDate($scope.form.endDate);
      if (s) parts.push(s);
      if (e && e !== s) parts.push(e);
      return (parts.length ? parts.join('_') : 'milk-bill') + '.' + ext;
    }

    $scope.printPage = function () { window.print(); };

    $scope.saveImage = function () {
      var source = document.querySelector('.receipt');

      var clone = source.cloneNode(true);
      clone.classList.remove('print-only');
      clone.style.cssText = 'display:block;background:#fff;width:794px;min-height:1123px;padding:48px 52px;box-sizing:border-box;font-family:Nunito,sans-serif;font-size:13px;line-height:1.5;color:#0F172A;';

      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      clone.querySelectorAll('.inv-header').forEach(function (el) {
        el.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:#0F172A;color:#fff;border-radius:12px;padding:28px 32px;margin-bottom:28px;';
      });
      clone.querySelectorAll('.inv-brand').forEach(function (el) {
        el.style.cssText = 'display:flex;align-items:center;gap:16px;';
      });
      clone.querySelectorAll('.inv-logo').forEach(function (el) {
        el.style.cssText = 'font-size:3rem;line-height:1;';
      });
      clone.querySelectorAll('.inv-title').forEach(function (el) {
        el.style.cssText = 'font-size:22px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;color:#F5C532;';
      });
      clone.querySelectorAll('.inv-subtitle').forEach(function (el) {
        el.style.cssText = 'font-size:13px;font-weight:700;letter-spacing:.18em;color:rgba(255,255,255,.55);text-transform:uppercase;';
      });
      clone.querySelectorAll('.inv-meta-right').forEach(function (el) {
        el.style.cssText = 'text-align:right;';
      });
      clone.querySelectorAll('.inv-period-label').forEach(function (el) {
        el.style.cssText = 'font-size:10px;font-weight:700;letter-spacing:.12em;color:rgba(255,255,255,.45);text-transform:uppercase;margin-bottom:2px;';
      });
      clone.querySelectorAll('.inv-period').forEach(function (el) {
        el.style.cssText = 'font-size:15px;font-weight:800;color:#fff;';
      });
      clone.querySelectorAll('.inv-rate').forEach(function (el) {
        el.style.cssText = 'font-size:12px;font-weight:600;color:#F5C532;margin-top:4px;';
      });
      clone.querySelectorAll('.inv-bill-section').forEach(function (el) {
        el.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;gap:24px;';
      });
      clone.querySelectorAll('.inv-bill-to').forEach(function (el) {
        el.style.cssText = 'flex:1;';
      });
      clone.querySelectorAll('.inv-section-label').forEach(function (el) {
        el.style.cssText = 'font-size:10px;font-weight:800;letter-spacing:.14em;color:#64748B;text-transform:uppercase;margin-bottom:4px;';
      });
      clone.querySelectorAll('.inv-buyer').forEach(function (el) {
        el.style.cssText = 'font-size:20px;font-weight:900;color:#0F172A;letter-spacing:-.01em;';
      });
      clone.querySelectorAll('.inv-summary-box').forEach(function (el) {
        el.style.cssText = 'display:flex;border:1.5px solid #E2E8F0;border-radius:10px;overflow:hidden;';
      });
      clone.querySelectorAll('.inv-summary-item').forEach(function (el, i, arr) {
        el.style.cssText = 'padding:10px 20px;text-align:center;' + (i < arr.length - 1 ? 'border-right:1.5px solid #E2E8F0;' : '');
      });
      clone.querySelectorAll('.inv-summary-label').forEach(function (el) {
        el.style.cssText = 'font-size:9px;font-weight:800;letter-spacing:.12em;color:#94A3B8;text-transform:uppercase;';
      });
      clone.querySelectorAll('.inv-summary-val').forEach(function (el) {
        el.style.cssText = 'font-size:15px;font-weight:900;color:#0F172A;margin-top:2px;';
      });
      clone.querySelectorAll('.inv-table').forEach(function (el) {
        el.style.cssText = 'width:100%;border-radius:10px;overflow:hidden;border:1.5px solid #E2E8F0;margin-bottom:20px;';
      });
      clone.querySelectorAll('.inv-th').forEach(function (el) {
        el.style.cssText = 'display:flex;background:#1E293B;color:#fff;font-size:10px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:10px 16px;';
      });
      clone.querySelectorAll('.inv-tr').forEach(function (el, i) {
        var bg = i % 2 === 1 ? '#F8FAFC' : '#fff';
        var color = '#1E293B';
        if (el.classList.contains('inv-tr-more')) { bg = '#DCFCE7'; color = '#14532D'; }
        if (el.classList.contains('inv-tr-less')) { bg = '#FEE2E2'; color = '#7F1D1D'; }
        el.style.cssText = 'display:flex;align-items:center;padding:7px 16px;border-bottom:1px solid #F1F5F9;font-size:12.5px;font-weight:600;background:' + bg + ';color:' + color + ';';
      });
      var colStyles = {
        'inv-col-no': 'width:32px;flex-shrink:0;font-weight:700;font-size:11px;',
        'inv-col-date': 'width:80px;flex-shrink:0;',
        'inv-col-day': 'width:72px;flex-shrink:0;',
        'inv-col-remark': 'flex:1;font-style:italic;font-size:11.5px;',
        'inv-col-qty': 'width:60px;flex-shrink:0;text-align:right;font-weight:800;',
        'inv-col-amt': 'width:80px;flex-shrink:0;text-align:right;font-weight:800;'
      };
      Object.keys(colStyles).forEach(function (cls) {
        clone.querySelectorAll('.' + cls).forEach(function (el) { el.style.cssText = colStyles[cls]; });
      });
      clone.querySelectorAll('.inv-totals').forEach(function (el) {
        el.style.cssText = 'margin-left:auto;width:320px;border:1.5px solid #E2E8F0;border-radius:10px;overflow:hidden;margin-bottom:32px;';
      });
      clone.querySelectorAll('.inv-total-row').forEach(function (el) {
        el.style.cssText = 'display:flex;justify-content:space-between;padding:10px 20px;font-size:13px;font-weight:700;color:#334155;border-bottom:1px solid #E2E8F0;';
      });
      clone.querySelectorAll('.inv-grand-total').forEach(function (el) {
        el.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:14px 20px;background:#0F172A;font-size:17px;font-weight:900;';
        var spans = el.querySelectorAll('span');
        if (spans[0]) spans[0].style.color = '#fff';
        if (spans[1]) spans[1].style.color = '#F5C532';
      });
      clone.querySelectorAll('.inv-footer').forEach(function (el) {
        el.style.cssText = 'text-align:center;font-size:14px;font-weight:700;color:#64748B;letter-spacing:.04em;padding-top:12px;border-top:1px solid #E2E8F0;';
      });

      html2canvas(clone, { scale: 2, backgroundColor: '#ffffff', useCORS: true, width: 794 }).then(function (canvas) {
        document.body.removeChild(wrapper);
        var fileName = buildFileName('png');
        canvas.toBlob(function (blob) {
          _shareFile = new File([blob], fileName, { type: 'image/png' });
          var dataUrl = URL.createObjectURL(blob);
          document.getElementById('receiptImg').src = dataUrl;
          var dlLink = document.getElementById('receiptDownload');
          dlLink.href = dataUrl;
          dlLink.download = fileName;
          var modal = new bootstrap.Modal(document.getElementById('receiptModal'));
          modal.show();
        }, 'image/png');
      });
    };

    $scope.shareImage = function () {
      if (!_shareFile) return;
      navigator.share({ files: [_shareFile], title: _shareFile.name })
        .catch(function () { }); // user cancelled — ignore
    };

    $scope.reset = function () {
      $scope.phase = 'form';
      $scope.rows = [];
      $scope.errors = {};
    };

  }]);
