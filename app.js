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

    var STORAGE_KEY = 'milkCalcForm';

    function loadSavedForm() {
      try {
        var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved) {
          if (saved.startDate) saved.startDate = parseLocalDate(saved.startDate);
          if (saved.endDate) saved.endDate = parseLocalDate(saved.endDate);
          return saved;
        }
      } catch (e) {}
      return { startDate: '', endDate: '', price: null, defaultMilk: null, buyerName: '' };
    }

    $scope.form = loadSavedForm();
    $scope.rows = [];

    var _shareFile = null;

    // ── Language ─────────────────────────────────────────────────────────────
    $scope.langs = [
      { code: 'en', label: 'English', flag: '🇬🇧' },
      { code: 'hi', label: 'हिंदी',   flag: '🇮🇳' }
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
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify($scope.form)); } catch (e) {}
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
      var date = (d instanceof Date) ? d : new Date(d);
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

      // Clone and strip print-only so CSS display:none !important doesn't kill it
      var clone = source.cloneNode(true);
      clone.classList.remove('print-only');
      clone.style.cssText = 'display:block;background:#fff;padding:24px;width:320px;font-family:Courier New,Courier,monospace;font-size:12px;line-height:1.5;color:#000;';

      var wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:fixed;left:-9999px;top:0;';
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Inline critical styles on the clone so html2canvas picks them up
      wrapper.querySelectorAll('.receipt-row').forEach(function (r) {
        r.style.cssText += 'display:flex;justify-content:space-between;padding:1px 2px;font-size:12px;';
      });
      wrapper.querySelectorAll('.receipt-row-remark').forEach(function (r) {
        r.style.cssText += 'display:block;font-size:10px;font-style:italic;padding:0 2px 3px 12px;';
      });
      wrapper.querySelectorAll('.receipt-col-heads').forEach(function (r) {
        r.style.cssText += 'display:flex;justify-content:space-between;font-weight:700;font-size:11px;text-transform:uppercase;padding:0 2px;';
      });
      wrapper.querySelectorAll('.receipt-total-row,.receipt-grand-total').forEach(function (r) {
        r.style.cssText += 'display:flex;justify-content:space-between;';
      });
      wrapper.querySelectorAll('.receipt-header').forEach(function (r) {
        r.style.textAlign = 'center';
      });
      wrapper.querySelectorAll('.receipt-footer').forEach(function (r) {
        r.style.cssText += 'text-align:center;font-weight:700;margin-top:10px;';
      });

      html2canvas(clone, { scale: 3, backgroundColor: '#ffffff', useCORS: true }).then(function (canvas) {
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
        .catch(function () {}); // user cancelled — ignore
    };

    $scope.reset = function () {
      $scope.phase = 'form';
      $scope.rows = [];
      $scope.errors = {};
    };

  }]);
