/* ====================== TETAPAN ====================== */
// Tampal URL Google Apps Script (Web App) di sini supaya jawapan murid dihantar ke Google Sheets.
// Biarkan kosong untuk ujian (jawapan tidak dihantar ke mana-mana).
var SHEET_URL = "https://script.google.com/macros/s/AKfycbw4DIKhr0omcqOLmUujD0V0x6Y2obb7rBQ1mFUhOS18VKDSBgDavsTRMBxvPw3mF6xu/exec";

// Tema bagi setiap tab (nama tema ada dalam style.css)
var TEMA_TAB = {
  induksi: "cina",      // selepas butang Mula (halaman utama guna "semua")
  l1: "melayu",
  l2: "india",
  l3: "kadazan",
  susun: "iban",
  penutup: "penutup"
};

/* ====================== ALAT BANTU ====================== */
function $(s) { return document.querySelector(s); }
// Nama & kelas murid disimpan dalam ingatan halaman sahaja (hilang apabila refresh).
var muridNama = "", muridKelas = "";
var NOTA_NAMA = "Nama dan kelas anda belum diisi. Sila pergi ke Set Induksi dan hantar nama serta kelas anda dahulu.";
// Refresh mengosongkan semua: skor lama dibuang dan semua kotak jawapan dikosongkan.
try { sessionStorage.removeItem("skorL3"); } catch (e) {}
window.addEventListener("load", function () {
  document.querySelectorAll("input[type=text], textarea").forEach(function (e) { e.value = ""; });
});
function simpan(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
function ambil(k) { try { return sessionStorage.getItem(k) || ""; } catch (e) { return ""; } }

// Hantar satu baris data ke Google Sheets. "lembaran" = nama tab dalam Sheet.
function hantarKeSheet(lembaran, data) {
  if (!SHEET_URL) { console.warn("SHEET_URL kosong: data tidak dihantar.", lembaran, data); return false; }
  data.lembaran = lembaran;
  data.masa = new Date().toISOString();
  try {
    fetch(SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data)
    });
  } catch (e) { console.warn(e); }
  return true;
}

/* ====================== BUNYI: MUZIK LATAR + 3 KESAN BUNYI ====================== */
// Satu elemen Audio (muzik) dan satu AudioContext (kesan bunyi), dimulakan sekali sahaja.
// Laraskan kelantangan muzik di sini (0 hingga 1):
var bunyi = (function () {
  var MUZIK_SRC = "forget_me_not_in_f_major_looped.ogg";
  var VOL_MUZIK = 0.20;          // kelantangan muzik biasa
  var VOL_MUZIK_BACA = 0.15;     // kelantangan muzik di Langkah 2 dan Langkah 3
  var VOL_KESAN = 0.12;          // kelantangan kesan bunyi (pop / loceng / chime)
  var KUNCI = "supkok-bunyi";    // simpanan localStorage: "on" / "off"

  var hidup = true;              // pilihan murid (ON secara lalai)
  try { if (localStorage.getItem(KUNCI) === "off") hidup = false; } catch (e) {}

  var muzik = null, ctx = null, induk = null;
  var sudahMula = false;         // gerak isyarat pertama sudah berlaku
  var muzikGagal = false;        // play() ditolak/ralat: jangan cuba berulang kali
  var sasaranVol = VOL_MUZIK, fadeId = null;
  var videoMain = false, dijedaVideo = false;   // video sedang dimainkan: muzik dijeda
  var dijedaTab = false;         // dijeda kerana tab tersembunyi
  var terakhir = { t: 0, p: 0 };
  var btn = null;

  function simpanPilihan() { try { localStorage.setItem(KUNCI, hidup ? "on" : "off"); } catch (e) {} }

  function dapatMuzik() {
    if (muzik) return muzik;
    try {
      muzik = new Audio(MUZIK_SRC);
      muzik.loop = true;
      muzik.preload = "auto";
      muzik.volume = sasaranVol;
      muzik.addEventListener("error", function () { muzikGagal = true; console.warn("Muzik tidak dapat dimuatkan. Semak fail ada di: " + MUZIK_SRC); });
    } catch (e) { muzik = null; muzikGagal = true; }
    return muzik;
  }

  function mainMuzik() {
    var m = dapatMuzik();
    if (!m || !hidup || muzikGagal || document.hidden || videoMain || !m.paused) return;
    try {
      var p = m.play();
      if (p && p.catch) p.catch(function (e) { muzikGagal = true; console.warn("Muzik tidak dapat dimainkan:", e && e.name); });
    } catch (e) { muzikGagal = true; }
  }

  function dapatCtx() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      induk = ctx.createGain();
      induk.gain.value = VOL_KESAN;
      induk.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function sambungCtx() {
    var c = dapatCtx();
    if (c && hidup && c.state === "suspended") { try { c.resume(); } catch (e) {} }
  }

  function lerekVol(sasaran) {
    sasaranVol = sasaran;
    var m = dapatMuzik();
    if (!m) return;
    if (fadeId) clearInterval(fadeId);
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) { m.volume = sasaran; return; }
    fadeId = setInterval(function () {
      var beza = sasaran - m.volume;
      if (Math.abs(beza) < 0.002) { m.volume = sasaran; clearInterval(fadeId); fadeId = null; return; }
      m.volume = Math.max(0, Math.min(1, m.volume + beza * 0.12));
    }, 40);
  }

  // Gerak isyarat pertama yang dibenarkan: mulakan muzik dan sedia AudioContext
  function isyaratPertama() {
    if (sudahMula) return;
    sudahMula = true;
    ["pointerup", "keydown", "touchend", "click"].forEach(function (n) { document.removeEventListener(n, isyaratPertama, true); });
    if (hidup) { dapatCtx(); sambungCtx(); mainMuzik(); }
  }
  ["pointerup", "keydown", "touchend", "click"].forEach(function (n) { document.addEventListener(n, isyaratPertama, true); });

  /* ---- Tiga kesan bunyi (Web Audio) ---- */
  function nada(frek, mula, tempoh, jenis, puncak, frekAkhir) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = jenis;
    o.frequency.setValueAtTime(frek, mula);
    if (frekAkhir) o.frequency.exponentialRampToValueAtTime(frekAkhir, mula + tempoh);
    g.gain.setValueAtTime(0.0001, mula);
    g.gain.exponentialRampToValueAtTime(puncak, mula + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, mula + tempoh);
    o.connect(g); g.connect(induk);
    o.start(mula); o.stop(mula + tempoh + 0.05);
  }

  var KESAN = {
    // Pop!: sapuan sinus menurun, pendek dan bulat
    pop: { p: 1, f: function (t) { nada(560, t, 0.12, "sine", 0.9, 220); } },
    // Loceng lembut: beberapa harmonik sinus dengan susutan semula jadi
    loceng: { p: 2, f: function (t) {
      nada(880, t, 1.3, "sine", 0.55); nada(1760, t, 0.8, "sine", 0.18); nada(2640, t, 0.4, "sine", 0.06);
    } },
    // Chime siap: empat nada menaik yang lembut (C5 E5 G5 C6)
    selesai: { p: 3, f: function (t) {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        var s = t + i * 0.13, d = i === 3 ? 1.1 : 0.55;
        nada(f, s, d, "triangle", 0.5); nada(f * 2, s, d * 0.6, "sine", 0.08);
      });
    } }
  };

  function main(nama) {
    if (!hidup) return;
    var c = dapatCtx();
    if (!c || !KESAN[nama]) return;
    var k = KESAN[nama], kini = Date.now();
    // Satu tindakan = satu bunyi: yang lebih tinggi keutamaan menang; yang rendah diabaikan
    if (kini - terakhir.t < 150 && k.p <= terakhir.p) return;
    terakhir = { t: kini, p: k.p };
    if (c.state === "suspended") { try { c.resume(); } catch (e) {} }
    try { k.f(c.currentTime + 0.01); } catch (e) {}
  }

  /* ---- Butang pembesar suara ---- */
  function kemaskiniButang() {
    if (!btn) return;
    btn.setAttribute("aria-pressed", hidup ? "true" : "false");
    btn.setAttribute("aria-label", hidup ? "Matikan bunyi" : "Hidupkan bunyi");
    btn.title = hidup ? "Matikan bunyi" : "Hidupkan bunyi";
    btn.classList.toggle("senyap", !hidup);
  }

  function togol() {
    hidup = !hidup;
    simpanPilihan();
    kemaskiniButang();
    var m = dapatMuzik();
    if (!hidup) {
      if (m && !m.paused) m.pause();                       // senyap serta-merta; kedudukan kekal
      if (ctx && ctx.state === "running") { try { ctx.suspend(); } catch (e) {} }
    } else {
      sudahMula = true;                                    // klik butang ialah gerak isyarat
      muzikGagal = false;                                  // tindakan murid: boleh cuba sekali lagi
      sambungCtx();
      mainMuzik();                                         // sambung dari kedudukan terakhir
    }
  }

  document.addEventListener("visibilitychange", function () {
    var m = muzik;
    if (document.hidden) {
      if (m && !m.paused) { m.pause(); dijedaTab = true; }
      if (ctx && ctx.state === "running") { try { ctx.suspend(); } catch (e) {} }
    } else {
      if (dijedaTab) { dijedaTab = false; mainMuzik(); }
      if (hidup && sudahMula) sambungCtx();
    }
  });

  function sedia() {
    btn = document.getElementById("btn-bunyi");
    if (!btn) return;
    btn.addEventListener("click", togol);
    kemaskiniButang();
  }
  sedia();

  // Muzik dijeda semasa video dimainkan, disambung semula dari kedudukan yang sama
  function videoStatus(main) {
    videoMain = main;
    if (main) { if (muzik && !muzik.paused) { muzik.pause(); dijedaVideo = true; } }
    else if (dijedaVideo) { dijedaVideo = false; mainMuzik(); }
  }

  return {
    video: videoStatus,
    pop: function () { main("pop"); },
    loceng: function () { main("loceng"); },
    selesai: function () { main("selesai"); },
    // Dipanggil apabila tab bertukar: muzik tidak dimulakan semula, hanya kelantangan berubah
    bahagian: function (tab) { lerekVol((tab === "l2" || tab === "l3") ? VOL_MUZIK_BACA : VOL_MUZIK); }
  };
})();

/* ====================== TEMA & TAB ====================== */
var hero = $("#hero");
var aktiviti = $("#induksi-aktiviti");
var tabSemasa = "induksi";

function setTema(nama) { document.body.setAttribute("data-theme", nama); }

function kemaskiniTema() {
  if (tabSemasa === "induksi" && !hero.hidden) {
    setTema("semua");                 // halaman utama: semua kaum
  } else {
    setTema(TEMA_TAB[tabSemasa]);
  }
}

// Butang Mula membuka aktiviti, butang Kembali menutupnya
$("#btn-mula").onclick = function () {
  hero.hidden = true;
  aktiviti.hidden = false;
  kemaskiniTema();
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Semak semula sama ada video wujud (ralat mungkin berlaku sebelum skrip sedia)
  semakVideo();
  setTimeout(semakVideo, 600);
  setTimeout(semakVideo, 2000);
};

document.querySelectorAll("#nav button").forEach(function (btn) {
  btn.onclick = function () {
    tabSemasa = btn.dataset.tab;
    document.querySelectorAll("section").forEach(function (s) {
      s.classList.toggle("active", s.id === tabSemasa);
    });
    document.querySelectorAll("#nav button").forEach(function (b) {
      b.classList.toggle("active", b === btn);
    });
    jedaSemuaVideo();

    // Menekan tab dalam menu sentiasa kembali ke halaman pertama tab itu.
    // Set Induksi: kembali ke halaman depan (jawapan murid yang sudah diisi kekal).
    if (tabSemasa === "induksi") {
      aktiviti.hidden = true;
      hero.hidden = false;
    }
    // (Tab lain belum ada sub-halaman; apabila dibina, set semula di sini.)

    kemaskiniTema();
    bunyi.bahagian(tabSemasa);
    window.scrollTo({ top: 0 });
  };
});

/* ====================== SET INDUKSI: 2 VIDEO + 3 SOALAN ====================== */
var soalan = $("#soalan");
var bloks = [$("#vblok1"), $("#vblok2")];

function jedaSemuaVideo() {
  document.querySelectorAll("video.vid").forEach(function (v) { if (!v.paused) v.pause(); });
}

function tunjukVideo2() {
  var b = $("#vblok2");
  if (!b.hidden) return;
  b.hidden = false;
  semakVideo();
  setTimeout(function () { b.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300);
}
function tunjukSoalan() {
  if (!soalan.hidden) return;
  soalan.hidden = false;
  soalan.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Nota "video tiada" hanya dipaparkan apabila pelayar benar-benar melaporkan ralat video
// (fail tiada atau format tidak disokong); disembunyikan semula jika video berjaya dimuatkan.
function semakVideo() {
  bloks.forEach(function (b) {
    var v = b.querySelector("video");
    b.querySelector(".vfallback").hidden = !v.error;
  });
}

function fmt(s) { s = Math.floor(s || 0); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }

// Pasang kawalan buatan sendiri (bingkai menutup kawalan asal) pada satu blok video.
// "selepas" dipanggil apabila video tamat (atau murid tekan "Teruskan" jika video tiada).
function pasangVideo(blok, selepas) {
  var vid = blok.querySelector("video");
  var vplay = blok.querySelector(".vplay");
  var vseek = blok.querySelector(".vseek");
  var vtime = blok.querySelector(".vtime");
  function togglePlay() { if (vid.paused) { vid.play(); } else { vid.pause(); } }
  vplay.onclick = togglePlay;
  vid.addEventListener("click", togglePlay);
  vid.addEventListener("play", function () {
    vplay.textContent = "⏸";
    bunyi.video(true);
    // Hanya satu video dimainkan pada satu masa
    document.querySelectorAll("video.vid").forEach(function (o) { if (o !== vid && !o.paused) o.pause(); });
  });
  vid.addEventListener("pause", function () {
    vplay.textContent = "▶";
    var masihMain = Array.prototype.some.call(document.querySelectorAll("video.vid"), function (v) { return !v.paused; });
    if (!masihMain) bunyi.video(false);
  });
  vid.addEventListener("ended", function () { vplay.textContent = "▶"; selepas(); });
  vid.addEventListener("timeupdate", function () {
    if (vid.duration) vseek.value = Math.round(vid.currentTime / vid.duration * 1000);
    vtime.textContent = fmt(vid.currentTime) + " / " + fmt(vid.duration);
  });
  vid.addEventListener("loadedmetadata", function () { vtime.textContent = "0:00 / " + fmt(vid.duration); semakVideo(); });
  vid.addEventListener("error", semakVideo);
  var vbesar = blok.querySelector(".vbesar");
  if (vbesar) vbesar.onclick = function () {
    var el = blok.querySelector(".vwrap");
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen();
    else if (vid.webkitEnterFullscreen) vid.webkitEnterFullscreen();   // iPhone
  };
  vseek.oninput = function () { if (vid.duration) vid.currentTime = vseek.value / 1000 * vid.duration; };
  blok.querySelector(".vlangkau").onclick = selepas;
}
pasangVideo(bloks[0], tunjukVideo2);   // Video 1 tamat -> Video 2 muncul
pasangVideo(bloks[1], tunjukSoalan);   // Video 2 tamat -> soalan muncul
semakVideo();

// Ikon besar betul / salah
var ICON_BETUL =
  '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#16a34a"/>' +
  '<path d="M27 52 L43 68 L74 34" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>';
var ICON_SALAH =
  '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#dc2626"/>' +
  '<path d="M32 32 L68 68 M68 32 L32 68" fill="none" stroke="#fff" stroke-width="11" stroke-linecap="round"/></svg>';
var popupTimer = null;
function tunjukIkon(betul) {
  var p = $("#popup");
  p.innerHTML = betul ? ICON_BETUL : ICON_SALAH;
  p.classList.remove("show");
  void p.offsetWidth;               // mulakan semula animasi
  p.classList.add("show");
  clearTimeout(popupTimer);
  popupTimer = setTimeout(function () { p.classList.remove("show"); }, 1300);
}

// Soalan 1-3. "betul" = nilai data-jwp bagi jawapan yang betul.
// "seterusnya" = kad yang dibuka selepas soalan ini dijawab dengan betul.
var SOALAN = {
  q1: { betul: "ya", seterusnya: "q2",
        ok:  "Betul! Ada kesalahan struktur ayat dalam video pertama. 🎉",
        bad: "Belum tepat. Cuba fikir semula tentang ayat-ayat dalam video pertama. Cuba lagi!" },
  q2: { betul: "tidak", seterusnya: "q3",
        ok:  "Betul! Tiada kesalahan struktur ayat dalam video kedua. 🎉",
        bad: "Belum tepat. Cuba fikir semula tentang ayat-ayat dalam video kedua. Cuba lagi!" },
  q3: { betul: "a", seterusnya: "maklumat",
        ok:  "Tepat! Ayat yang betul strukturnya lebih jelas dan mudah difahami. 🎉",
        bad: "Belum tepat. Bandingkan semula ayat dalam kedua-dua video. Cuba lagi!" }
};
var jawapanPertama = { q1: "", q2: "", q3: "" };
var percubaan = { q1: 0, q2: 0, q3: 0 };
var selesai = { q1: false, q2: false, q3: false };

document.querySelectorAll(".card[data-q] .yt-btn").forEach(function (b) {
  b.onclick = function () {
    var kad = b.closest(".card");
    var id = kad.dataset.q;
    var s = SOALAN[id];
    if (selesai[id]) return;
    var pilih = b.dataset.jwp;
    bunyi.pop();
    percubaan[id]++;
    if (!jawapanPertama[id]) jawapanPertama[id] = pilih;
    var betul = (pilih === s.betul);
    tunjukIkon(betul);
    var fb = kad.querySelector(".fb");
    if (betul) {
      selesai[id] = true;
      b.classList.add("betul");
      kad.querySelectorAll(".yt-btn").forEach(function (x) { x.disabled = true; });
      fb.className = "fb ok";
      fb.textContent = s.ok;
      var seterusnya = $("#" + s.seterusnya);
      seterusnya.hidden = false;
      if (s.seterusnya === "maklumat") {
        // Nama & kelas sengaja dibiarkan kosong supaya murid seterusnya mengisi sendiri.
      }
      setTimeout(function () { seterusnya.scrollIntoView({ behavior: "smooth", block: "start" }); }, 900);
    } else {
      b.classList.add("salah");
      b.disabled = true;
      fb.className = "fb bad";
      fb.textContent = s.bad;
    }
  };
});

// Hantar nama, kelas dan jawapan ke Google Sheets
$("#btn-hantar").onclick = function () {
  var nama = $("#nama").value.trim();
  var kelas = $("#kelas").value.trim();
  var fb = $("#hantar-fb");
  if (!nama || !kelas) { fb.className = "fb bad"; fb.textContent = "Sila isi nama dan kelas anda."; return; }

  muridNama = nama; muridKelas = kelas;
  var dihantar = hantarKeSheet("Induksi", {
    nama: nama,
    kelas: kelas,
    soalan1_jawapan_pertama: jawapanPertama.q1,
    soalan1_percubaan: percubaan.q1,
    soalan2_jawapan_pertama: jawapanPertama.q2,
    soalan2_percubaan: percubaan.q2,
    soalan3_jawapan_pertama: jawapanPertama.q3,
    soalan3_percubaan: percubaan.q3
  });

  $("#btn-hantar").disabled = true;
  $("#nama").disabled = true;
  $("#kelas").disabled = true;
  fb.className = "fb ok";
  fb.textContent = "Terima kasih! Jawapan anda telah dihantar. 👍";
  if (!dihantar) {
    var nota = $("#hantar-nota");
    nota.hidden = false;
    nota.textContent = "(Mod ujian: SHEET_URL belum diisi, jadi jawapan belum dihantar ke Google Sheets.)";
  }
  $("#lanjut").hidden = false;
};

$("#btn-lanjut").onclick = function () {
  document.querySelector('#nav button[data-tab="l1"]').click();
};

/* ====================== LANGKAH 1: SuP(KOK) ====================== */
// Setiap butang membuka/menutup panelnya sendiri sahaja;
// panel lain yang sudah dibuka kekal terbuka.
document.querySelectorAll("#sup-list .sup-btn").forEach(function (b) {
  b.onclick = function () {
    var item = b.closest(".sup-item");
    var buka = item.classList.toggle("buka");
    bunyi.pop();
    b.setAttribute("aria-expanded", buka ? "true" : "false");
  };
});

/* ====================== LANGKAH 1: butang Teruskan ====================== */
$("#btn-l1-lanjut").onclick = function () {
  document.querySelector('#nav button[data-tab="l2"]').click();
};

/* ====================== LANGKAH 3: CARI KESALAHAN TATABAHASA ====================== */
// Ayat bertanda data-salah="1" ialah ayat yang salah.
// Betul ditekan -> bertukar merah. Ayat yang tidak salah ditekan -> tanda X.
var l3Ayat = document.querySelectorAll("#l3-teks .ayat");
var l3Jumlah = document.querySelectorAll("#l3-teks .ayat[data-salah]").length;
var l3Jumpa = 0;
$("#l3-jumlah").textContent = l3Jumlah;

function klikAyat(el) {
  if (el.classList.contains("jumpa")) return;       // sudah ditemui
  if (el.hasAttribute("data-salah")) {
    el.classList.add("jumpa");
    bunyi.loceng();
    l3Jumpa++;
    $("#l3-kira").textContent = l3Jumpa;
    var bar3 = $("#l3-bar"); bar3.style.width = (l3Jumpa / l3Jumlah * 100) + "%"; bar3.classList.add("ada");
    // Kotak betulkan muncul terus selepas perenggan itu, bersama ayat yang ditemui
    var para = el.closest("p"), kotak = para && para.nextElementSibling;
    if (kotak && kotak.classList.contains("l3-kotak")) {
      kotak.hidden = false;
      var ta = kotak.querySelector("textarea");
      setTimeout(function () { if (ta) ta.focus({ preventScroll: true }); kotak.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 120);
    }
    if (l3Jumpa === l3Jumlah) $("#l3-tahniah").hidden = false;
    kemaskiniL3();
  } else {
    tunjukIkon(false);
  }
}
// Keadaan ayat (dipilih / sudah ada pembetulan) dan kad "Semak jawapan".
// "Sudah ditulis" hanya bermaksud ada teks, BUKAN bahawa jawapan itu betul.
function kemaskiniL3() {
  var siap = 0, semua = true;
  document.querySelectorAll("#l3-teks .l3-kotak").forEach(function (kotak) {
    var ta = kotak.querySelector("textarea");
    var ayat = kotak.previousElementSibling && kotak.previousElementSibling.querySelector(".ayat[data-salah]");
    var ada = !kotak.hidden && ta.value.trim().length > 0;
    if (ayat) ayat.classList.toggle("ditulis", ada);
    if (ada) siap++; else semua = false;
  });
  $("#l3-betul-kira").textContent = siap;
  var kad = $("#l3-betulkan");
  if (!$("#l3-semak").disabled) kad.hidden = !(l3Jumpa === l3Jumlah && semua);
}
document.querySelectorAll("#l3-teks .l3-jwb").forEach(function (ta) {
  ta.addEventListener("input", kemaskiniL3);
});
l3Ayat.forEach(function (el) {
  el.onclick = function () { klikAyat(el); };
  el.onkeydown = function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); klikAyat(el); } };
});

/* ====================== LANGKAH 3: BETULKAN AYAT + SKOR ====================== */
// Jawapan mesti SAMA TEPAT (huruf besar/kecil dan tanda baca dikira).
// Hanya ruang kosong berlebihan di hujung/antara perkataan diabaikan.
var JAWAPAN_L3 = [
  "Beliau banyak menubuhkan kerja amal bagi membantu golongan yang kurang bernasib baik.",
  "Perkhidmatan itu terbuka kepada sesiapa sahaja yang memerlukan bantuan tanpa mengira kaum dan agama.",
  "Tujuan penubuhan CP bukan sekadar untuk membantu golongan susah tetapi juga meliputi hal-hal lain.",
  "Seseorang yang suka membuat kebajikan akan mendapat kebaikan berpanjangan seperti air yang mengalir tanpa henti."
];
function rapikan(t) { return t.replace(/\s+/g, " ").trim(); }

$("#l3-semak").onclick = function () {
  var nama = muridNama, kelas = muridKelas;   // diisi sekali sahaja di Set Induksi
  var fb = $("#l3-fb");
  var kotak = document.querySelectorAll(".l3-jwb");
  var kosong = false;
  kotak.forEach(function (t) { if (!t.value.trim()) kosong = true; });
  if (kosong) { fb.className = "fb bad"; fb.textContent = "Sila isi kesemua 4 jawapan dahulu."; return; }
  if (!nama || !kelas) { fb.className = "fb bad"; fb.textContent = NOTA_NAMA; return; }

  var skor = 0;
  var data = { nama: nama, kelas: kelas };
  kotak.forEach(function (t, i) {
    var betul = rapikan(t.value) === JAWAPAN_L3[i];
    if (betul) skor++;
    var fbk = t.parentNode.querySelector(".l3-fb-kotak");
    t.classList.add(betul ? "betul" : "salah");
    fbk.className = "fb l3-fb-kotak " + (betul ? "ok" : "bad");
    fbk.textContent = betul ? "✔ Betul" : "✘ Belum tepat";
    t.disabled = true;
    data["jawapan" + (i + 1)] = t.value.trim();
    data["betul" + (i + 1)] = betul ? 1 : 0;
  });
  data.skor = skor;
  var dihantar = hantarKeSheet("Langkah 3", data);

  $("#l3-semak").disabled = true;
  fb.className = "fb ok";
  fb.textContent = "Terima kasih! Jawapan anda telah dihantar. 👍";
  if (!dihantar) {
    var nota = $("#l3-nota");
    nota.hidden = false;
    nota.textContent = "(Mod ujian: SHEET_URL belum diisi, jadi jawapan belum dihantar ke Google Sheets.)";
  }

  simpan("skorL3", String(skor));                      // digunakan untuk menentukan aktiviti di Aktiviti Susun Ayat
  $("#l3-skor-no").textContent = skor;
  $("#l3-skor-msg").textContent =
    skor === 4 ? "Hebat! Semua jawapan anda betul! 🎉" :
    skor > 0   ? "Bagus! Teruskan usaha. 💪" :
                 "Jangan putus asa. Cuba lagi pada lain kali! 💪";
  var kad = $("#l3-skor");
  kad.hidden = false;
  $("#l3-lanjut").hidden = false;
  setTimeout(function () { kad.scrollIntoView({ behavior: "smooth", block: "center" }); }, 300);
};

$("#btn-l3-lanjut").onclick = function () {
  document.querySelector('#nav button[data-tab="susun"]').click();
};

/* ====================== LANGKAH 1: SERET & LETAK PERKATAAN ====================== */
// Satu jadual bagi setiap ayat (.susun-kad), setiap satu dengan kolam perkataannya sendiri.
// Hanya letak yang tepat diterima. Boleh seret (tetikus / sentuh), atau tekan perkataan
// dahulu kemudian tekan petak.
(function () {
  var dipilih = null;
  function pilih(c) {
    if (dipilih) dipilih.classList.remove("dipilih");
    dipilih = (c && c !== dipilih) ? c : null;
    if (dipilih) { dipilih.classList.add("dipilih"); bunyi.pop(); }
  }
  function bersih() {
    document.querySelectorAll(".drop.atas").forEach(function (d) { d.classList.remove("atas"); });
  }

  function semakBaris(tr) {
    if (tr.querySelectorAll(".drop:not(.penuh)").length) return;
    var kotak = tr.nextElementSibling;
    var td = kotak.firstElementChild;
    td.innerHTML = "";
    tr.querySelectorAll(".drop").forEach(function (d, i) {
      var c = d.firstElementChild;
      var s = document.createElement("span");
      s.className = "m m-" + c.dataset.kat;
      s.textContent = c.textContent.replace(/\.$/, "");
      td.appendChild(s);
      td.appendChild(document.createTextNode(" "));
    });
    td.lastChild.remove();
    td.appendChild(document.createTextNode("."));
    kotak.hidden = false;
    var kolamKad = tr.closest(".susun-kad").querySelector(".kolam-kata");
    if (!kolamKad.querySelector(".wchip")) kolamKad.hidden = true;   // kolam kosong: sembunyikan
    tunjukIkon(true);
    if (document.querySelectorAll(".susun-kad .drop:not(.penuh)").length === 0) {
      $("#jadual-tahniah").hidden = false;
    }
  }

  function letak(chip, sel, kad) {
    if (!chip || !sel || sel.classList.contains("penuh")) return false;
    var tr = sel.parentNode;
    var betul = chip.dataset.kat === sel.dataset.kat && chip.dataset.ayat === tr.dataset.ayat;
    if (!betul) {
      tunjukIkon(false);
      sel.classList.add("goncang");
      setTimeout(function () { sel.classList.remove("goncang"); }, 450);
      return false;
    }
    chip.classList.remove("dipilih", "diseret");
    chip.classList.add("letak");
    chip.removeAttribute("tabindex");
    if (dipilih === chip) dipilih = null;
    sel.appendChild(chip);
    sel.classList.add("penuh");
    sel.removeAttribute("tabindex");
    bunyi.pop();
    semakBaris(tr);
    return true;
  }

  function sasaran(x, y, kad) {
    var e = document.elementFromPoint(x, y);
    var d = e ? e.closest(".drop") : null;
    return (d && kad.contains(d)) ? d : null;     // hanya petak dalam jadual yang sama
  }

  document.querySelectorAll(".susun-kad").forEach(function (kad) {
    var kolam = kad.querySelector(".kolam-kata");
    var chips = Array.prototype.slice.call(kolam.children);
    // Susun rawak (Fisher-Yates) dan pastikan tidak sama dengan susunan ayat yang betul
    var asal = chips.slice(), susunan;
    do {
      susunan = chips.slice();
      for (var i = susunan.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = susunan[i]; susunan[i] = susunan[j]; susunan[j] = t;
      }
    } while (susunan.every(function (c, i) { return c === asal[i]; }));
    susunan.forEach(function (c) { kolam.appendChild(c); });

    chips.forEach(function (chip) {
      var mula = null, hantu = null, seret = false;
      chip.addEventListener("pointerdown", function (e) {
        if (chip.classList.contains("letak")) return;
        mula = { x: e.clientX, y: e.clientY };
        seret = false;
        try { chip.setPointerCapture(e.pointerId); } catch (x) {}
      });
      chip.addEventListener("pointermove", function (e) {
        if (!mula) return;
        if (!seret && Math.hypot(e.clientX - mula.x, e.clientY - mula.y) > 6) {
          seret = true;
          var r = chip.getBoundingClientRect();
          hantu = chip.cloneNode(true);
          hantu.classList.add("hantu");
          hantu.style.left = r.left + "px";
          hantu.style.top = r.top + "px";
          hantu._dx = e.clientX - r.left;
          hantu._dy = e.clientY - r.top;
          document.body.appendChild(hantu);
          chip.classList.add("diseret");
        }
        if (seret) {
          hantu.style.left = (e.clientX - hantu._dx) + "px";
          hantu.style.top = (e.clientY - hantu._dy) + "px";
          bersih();
          var t = sasaran(e.clientX, e.clientY, kad);
          if (t && !t.classList.contains("penuh")) t.classList.add("atas");
        }
      });
      chip.addEventListener("pointerup", function (e) {
        if (!mula) return;
        var adaSeret = seret;
        mula = null; seret = false;
        bersih();
        if (hantu) { hantu.remove(); hantu = null; }
        chip.classList.remove("diseret");
        if (adaSeret) letak(chip, sasaran(e.clientX, e.clientY, kad), kad);
        else pilih(chip);                       // ketik sahaja: pilih perkataan
      });
      chip.addEventListener("pointercancel", function () {
        mula = null; seret = false; bersih();
        if (hantu) { hantu.remove(); hantu = null; }
        chip.classList.remove("diseret");
      });
      chip.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pilih(chip); }
      });
    });

    // Pilih perkataan kemudian tekan petak (berguna di telefon dan papan kekunci)
    kad.querySelectorAll(".drop").forEach(function (sel) {
      sel.addEventListener("click", function () { if (dipilih) letak(dipilih, sel, kad); });
      sel.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && dipilih) { e.preventDefault(); letak(dipilih, sel, kad); }
      });
    });
  });
})();

/* ====================== LANGKAH 2: JOM BINA AYAT ====================== */
// Murid meneliti gambar melekat di kiri, bertukar antara 3 tab aktiviti di kanan,
// menulis 3 ayat lengkap menggunakan struktur SuP(KOK), dan menghantar ke Google Sheets (tab "Langkah 2").
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll("#l2 .l2-tab"));
  var kads = Array.prototype.slice.call(document.querySelectorAll("#l2 .bina-kad"));
  var semaks = Array.prototype.slice.call(document.querySelectorAll("#l2 .l2-semak-kendiri"));
  var sudahHantar = false;

  // Besarkan gambar (klik pada gambar atau butang "Besarkan gambar")
  function bukaZum() { $("#l2-zum").hidden = false; }
  $("#l2-gambar").onclick = bukaZum;
  if ($("#l2-btn-zum")) $("#l2-btn-zum").onclick = bukaZum;
  $("#l2-zum").onclick = function () { this.hidden = true; };

  // Tukar tab aktiviti (Aktiviti 1 | Aktiviti 2 | Aktiviti 3)
  function pilihTab(no, fokusTab) {
    tabs.forEach(function (t) {
      var aktif = t.dataset.aktiviti === String(no);
      t.classList.toggle("active", aktif);
      t.setAttribute("aria-selected", aktif ? "true" : "false");
      t.tabIndex = aktif ? 0 : -1;
      if (aktif && fokusTab) t.focus();
    });
    kads.forEach(function (k) {
      k.hidden = k.dataset.no !== String(no);
    });
    semaks.forEach(function (s) {
      s.hidden = s.dataset.no !== String(no);
    });
  }

  tabs.forEach(function (tab, idx) {
    tab.onclick = function () {
      bunyi.pop();
      pilihTab(tab.dataset.aktiviti, false);
    };
    tab.onkeydown = function (e) {
      var arah = 0;
      if (e.key === "ArrowRight") arah = 1;
      else if (e.key === "ArrowLeft") arah = -1;
      if (arah !== 0) {
        e.preventDefault();
        var baru = (idx + arah + tabs.length) % tabs.length;
        bunyi.pop();
        pilihTab(tabs[baru].dataset.aktiviti, true);
      }
    };
  });

  // Kemas kini penanda siap (✓) bagi setiap tab tanpa menilai tatabahasa secara automatik
  function kemaskiniStatus() {
    var siapKira = 0;
    kads.forEach(function (k) {
      var no = k.dataset.no;
      var ta = k.querySelector(".bina-ayat");
      var ada = ta.value.trim().length > 0;
      var tanda = $("#l2-status-" + no);
      if (tanda) {
        tanda.hidden = !ada;
        tanda.setAttribute("aria-label", ada ? "Ayat sudah ditulis" : "Belum diisi");
      }
      k.classList.toggle("ada-isi", ada);
      if (ada) k.classList.remove("kurang");
      if (ada) siapKira++;
    });
    var progres = $("#l2-progres-teks");
    if (progres) progres.textContent = siapKira + " / 3 ayat ditulis";
    // Kad "Hantar jawapan" hanya dipaparkan apabila ketiga-tiga ayat telah ditulis
    // (kekal dipaparkan selepas penghantaran).
    var kad = $("#l2-hantar-kad");
    if (kad) kad.hidden = !(siapKira === kads.length || sudahHantar);
  }

  kads.forEach(function (k) {
    var ta = k.querySelector(".bina-ayat");
    ta.addEventListener("input", kemaskiniStatus);

    // Butang bantuan SuP(KOK) boleh dibuka dan ditutup secara bebas bagi setiap aktiviti
    var btnBantuan = k.querySelector(".l2-bantuan-btn");
    var panelPanduan = k.querySelector(".l2-panduan");
    if (btnBantuan && panelPanduan) {
      btnBantuan.onclick = function () {
        var buka = panelPanduan.hidden;
        panelPanduan.hidden = !buka;
        btnBantuan.setAttribute("aria-expanded", buka ? "true" : "false");
      };
    }

    // Senarai semak kendiri aktiviti ini (kini di lajur kiri, di bawah gambar)
    var semak = $("#l2-semak-" + k.dataset.no);
    var chks = Array.prototype.slice.call(semak.querySelectorAll(".l2-chk"));
    var ingat = k.querySelector(".l2-ingat");
    var lengkap = false;
    function semuaTanda() { return chks.every(function (c) { return c.checked; }); }

    // Pastikan kotak semak kendiri bermula tidak bertanda apabila halaman dimuatkan semula
    chks.forEach(function (chk) { chk.checked = false; });

    // Peringatan "Jangan lupa!": muncul apabila murid meninggalkan kotak (blur) dan ada teks,
    // kekal sehingga keempat-empat petak ditanda, dan hilang jika kotak dikosongkan.
    function kemaskiniIngat(dariBlur) {
      var ada = ta.value.trim().length > 0;
      if (!ada || semuaTanda()) { ingat.hidden = true; return; }
      if (dariBlur) ingat.hidden = false;
    }
    ta.addEventListener("blur", function () { kemaskiniIngat(true); });
    ta.addEventListener("input", function () {
      // Ayat disunting selepas disemak sepenuhnya: senarai semak dikosongkan supaya disemak semula
      if (lengkap) { chks.forEach(function (c) { c.checked = false; }); lengkap = false; }
      if (!ta.value.trim()) ingat.hidden = true;
    });
    chks.forEach(function (c) {
      c.addEventListener("change", function () {
        lengkap = semuaTanda();
        if (lengkap) ingat.hidden = true;
        else kemaskiniIngat(false);
      });
    });
  });
  kemaskiniStatus();

  // Hantar ketiga-tiga ayat ke Google Sheets (tab "Langkah 2")
  $("#l2-hantar").onclick = function () {
    if (sudahHantar) return;
    var fb = $("#l2-fb");
    var nama = muridNama, kelas = muridKelas;   // diisi sekali sahaja di Set Induksi
    var data = { nama: nama, kelas: kelas };
    var pertamaKosong = null;

    kads.forEach(function (k, i) {
      var n = i + 1;
      var ayat = k.querySelector(".bina-ayat").value.trim();
      var kosong = !ayat;
      k.classList.toggle("kurang", kosong);
      if (kosong && !pertamaKosong) pertamaKosong = String(n);

      // Kekalkan struktur medan data Google Sheets sedia ada
      data["aktiviti" + n] = "";
      data["subjek" + n] = "";
      data["kata_kerja" + n] = "";
      data["objek" + n] = "";
      data["keterangan" + n] = "";
      data["ayat" + n] = ayat;
    });

    if (pertamaKosong) {
      pilihTab(pertamaKosong, false);
      var taKosong = $("#l2-ayat-" + pertamaKosong);
      if (taKosong) taKosong.focus();
      fb.className = "fb bad";
      fb.textContent = "Sila tulis ayat lengkap bagi Aktiviti " + pertamaKosong + " sebelum menghantar (ketiga-tiga aktiviti mesti diisi).";
      return;
    }
    if (!nama || !kelas) {
      fb.className = "fb bad";
      fb.textContent = NOTA_NAMA;
      return;
    }

    var dihantar = hantarKeSheet("Langkah 2", data);
    sudahHantar = true;

    $("#l2-hantar").disabled = true;
    document.querySelectorAll("#l2 .bina-ayat, #l2 .l2-chk").forEach(function (e) { e.disabled = true; });
    fb.className = "fb ok";
    fb.textContent = "Terima kasih! Ketiga-tiga ayat anda telah dihantar. 👍";
    if (!dihantar) {
      var nota = $("#l2-nota");
      nota.hidden = false;
      nota.textContent = "(Mod ujian: SHEET_URL belum diisi, jadi jawapan belum dihantar ke Google Sheets.)";
    }
    $("#l2-lanjut").hidden = false;
  };

  $("#l2-btn-lanjut").onclick = function () {
    document.querySelector('#nav button[data-tab="l3"]').click();
  };
})();

/* ====================== AKTIVITI PENGUKUHAN: SUSUN PERKATAAN ====================== */
// Setiap ayat: "bahagian" = kepingan perkataan (susunan di sini ialah susunan YANG BETUL;
// skrip akan mengacaknya untuk murid). Untuk tukar ayat / gambar, ubah senarai ini sahaja.
var AYAT_PENGUKUHAN = {
  pemulihan: [
    { gambar: "pemulihan-1.jpg", bahagian: ["Siti", "membantu ibunya", "menyediakan makanan", "untuk", "majlis keluarga"] },
    { gambar: "pemulihan-2.jpg", bahagian: ["Mereka", "mengutip", "sampah", "di taman", "setiap petang"] },
    { gambar: "pemulihan-3.jpg", bahagian: ["Amir", "membantu", "rakan-rakannya", "di kelas", "setiap hari"] },
    { gambar: "pemulihan-4.jpg", bahagian: ["Penduduk", "bergotong-royong", "di kampung", "pada hujung minggu"] },
    { gambar: "pemulihan-5.jpg", bahagian: ["Keluarga Ravi", "memberikan", "kuih", "kepada jirannya", "semasa perayaan"] }
  ],
  pengayaan: [
    { gambar: "pengayaan-1.jpg", bahagian: ["Penduduk", "di Taman Perumahan Luyang itu", "bekerjasama", "membersihkan", "kawasan taman permainan", "pada setiap hujung minggu"] },
    { gambar: "pengayaan-2.jpg", bahagian: ["Murid-murid Tahun Lima", "mempersembahkan", "tarian etnik", "di dewan sekolah", "sempena sambutan", "Hari Kebangsaan"] },
    { gambar: "pengayaan-3.jpg", bahagian: ["Ahli Kelab Sukarelawan", "mengagihkan", "bantuan makanan", "kepada mangsa banjir", "di pusat pemindahan sementara"] },
    { gambar: "pengayaan-4.jpg", bahagian: ["Murid-murid Tahun Enam", "mengumpulkan", "sumbangan pakaian", "untuk membantu", "mangsa banjir"] },
    { gambar: "pengayaan-5.jpg", bahagian: ["Semua murid", "menyanyikan", "lagu patriotik", "dengan penuh semangat", "semasa", "perhimpunan sekolah"] }
  ]
};

function binaPengukuhan(tahap) {
  var wadah = $("#susun-" + tahap);
  if (!wadah || wadah.dataset.siap) return;
  wadah.dataset.siap = "1";
  var senarai = wadah.querySelector(".susun-senarai");
  var data = AYAT_PENGUKUHAN[tahap];
  var betulKira = 0;
  wadah.querySelector(".susun-jumlah").textContent = data.length;
  var dipilih = null;
  function pilih(c) {
    if (dipilih) dipilih.classList.remove("dipilih");
    dipilih = (c && c !== dipilih) ? c : null;
    if (dipilih) { dipilih.classList.add("dipilih"); bunyi.pop(); }
  }

  data.forEach(function (d, n) {
    var kad = document.createElement("div");
    kad.className = "card p-kad";
    kad.innerHTML =
      '<h3>Ayat ' + (n + 1) + '</h3>' +
      '<img class="p-gambar" src="' + d.gambar + '" alt="Gambar untuk ayat ' + (n + 1) + '">' +
      '<div class="p-baris"></div>' +
      '<div class="p-kolam"></div>' +
      '<p class="p-nota muted">Seret perkataan ke petak, atau ketik perkataan kemudian ketik petak. Ketik perkataan dalam petak untuk mengeluarkannya.</p>';
    senarai.appendChild(kad);
    var baris = kad.querySelector(".p-baris");
    var kolam = kad.querySelector(".p-kolam");
    var slots = [], chips = [];
    var selesaiKad = false;

    d.bahagian.forEach(function (t, i) {
      var sl = document.createElement("div");
      sl.className = "p-slot"; sl.dataset.no = i + 1; sl.tabIndex = 0;
      baris.appendChild(sl); slots.push(sl);
      var c = document.createElement("span");
      c.className = "p-chip"; c.tabIndex = 0; c.textContent = t;
      chips.push(c);
    });
    // Susun rawak, pastikan tidak sama dengan susunan betul
    var susunan;
    do {
      susunan = chips.slice();
      for (var i = susunan.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = susunan[i]; susunan[i] = susunan[j]; susunan[j] = tmp;
      }
    } while (susunan.every(function (c, i) { return c === chips[i]; }));
    susunan.forEach(function (c) { kolam.appendChild(c); });

    function bersih() { slots.forEach(function (s) { s.classList.remove("atas"); }); }
    function sasaran(x, y) {
      var e = document.elementFromPoint(x, y);
      var s = e ? e.closest(".p-slot") : null;
      return (s && baris.contains(s)) ? s : null;
    }

    function semak() {
      if (slots.some(function (s) { return !s.firstElementChild; })) return;
      var betul = slots.every(function (s, i) { return s.firstElementChild === chips[i]; });
      if (betul) {
        selesaiKad = true;
        kad.classList.add("betul");
        chips.forEach(function (c) { c.removeAttribute("tabindex"); });
        slots.forEach(function (s) { s.removeAttribute("tabindex"); });
        kad.querySelector(".p-nota").hidden = true;
        var p = document.createElement("p");
        p.className = "p-ayat-betul";
        p.textContent = d.bahagian.join(" ") + ".";
        kad.appendChild(p);
        tunjukIkon(true);
        betulKira++;
        wadah.querySelector(".susun-kira").textContent = betulKira;
        var barP = wadah.querySelector(".bar .isi"); barP.style.width = (betulKira / data.length * 100) + "%"; barP.classList.add("ada");
        if (betulKira === data.length) wadah.querySelector(".susun-tahniah").hidden = false;
      } else {
        tunjukIkon(false);
        slots.forEach(function (s) { s.classList.add("goncang"); });
        setTimeout(function () {
          slots.forEach(function (s) {
            s.classList.remove("goncang", "penuh");
            if (s.firstElementChild) kolam.appendChild(s.firstElementChild);   // semua perkataan kembali; cuba lagi
          });
        }, 800);
      }
    }

    function letak(chip, slot) {
      if (selesaiKad || !chip || !slot || slot.firstElementChild) return;
      chip.classList.remove("dipilih", "diseret");
      if (dipilih === chip) dipilih = null;
      slot.appendChild(chip);
      slot.classList.add("penuh");
      semak();
      if (selesaiKad) bunyi.selesai(); else bunyi.pop();   // chime mengatasi pop
    }
    function keluarkan(chip) {
      var s = chip.parentNode;
      if (!s || !s.classList.contains("p-slot")) return false;
      s.classList.remove("penuh");
      kolam.appendChild(chip);
      return true;
    }

    chips.forEach(function (chip) {
      var mula = null, hantu = null, seret = false;
      chip.addEventListener("pointerdown", function (e) {
        if (selesaiKad) return;
        mula = { x: e.clientX, y: e.clientY }; seret = false;
        try { chip.setPointerCapture(e.pointerId); } catch (x) {}
      });
      chip.addEventListener("pointermove", function (e) {
        if (!mula) return;
        if (!seret && Math.hypot(e.clientX - mula.x, e.clientY - mula.y) > 6) {
          seret = true;
          var r = chip.getBoundingClientRect();
          hantu = chip.cloneNode(true);
          hantu.classList.add("hantu");
          hantu.style.left = r.left + "px"; hantu.style.top = r.top + "px";
          hantu._dx = e.clientX - r.left; hantu._dy = e.clientY - r.top;
          document.body.appendChild(hantu);
          chip.classList.add("diseret");
        }
        if (seret) {
          hantu.style.left = (e.clientX - hantu._dx) + "px";
          hantu.style.top = (e.clientY - hantu._dy) + "px";
          bersih();
          var t = sasaran(e.clientX, e.clientY);
          if (t && !t.firstElementChild) t.classList.add("atas");
        }
      });
      chip.addEventListener("pointerup", function (e) {
        if (!mula) return;
        var adaSeret = seret;
        mula = null; seret = false;
        bersih();
        if (hantu) { hantu.remove(); hantu = null; }
        chip.classList.remove("diseret");
        if (adaSeret) {
          var t = sasaran(e.clientX, e.clientY);
          if (t && !t.firstElementChild) { keluarkan(chip); letak(chip, t); }
          else if (!t && chip.parentNode.classList.contains("p-slot")) keluarkan(chip);   // diseret keluar: kembali ke kolam
        } else if (chip.parentNode.classList.contains("p-slot")) {
          keluarkan(chip);                                // ketik perkataan dalam petak: keluarkan
        } else pilih(chip);                               // ketik perkataan di kolam: pilih
      });
      chip.addEventListener("pointercancel", function () {
        mula = null; seret = false; bersih();
        if (hantu) { hantu.remove(); hantu = null; }
        chip.classList.remove("diseret");
      });
      chip.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!keluarkan(chip)) pilih(chip);
        }
      });
    });

    slots.forEach(function (sl) {
      sl.addEventListener("click", function (e) { if (dipilih && e.target === sl) letak(dipilih, sl); });
      sl.addEventListener("keydown", function (e) {
        if ((e.key === "Enter" || e.key === " ") && dipilih && e.target === sl) { e.preventDefault(); letak(dipilih, sl); }
      });
    });
  });
}

/* ====================== AKTIVITI PENGUKUHAN: PEMULIHAN / PENGAYAAN ====================== */
// Ditentukan oleh skor Langkah 3 (disimpan sebagai "skorL3"): 1-2 = pemulihan, 3-4 = pengayaan.
// Tiada skor (Langkah 3 belum dihantar) = minta murid ke Langkah 3 dahulu.
function tahapMurid() {
  var s = ambil("skorL3");
  if (s === "") return "";
  s = parseInt(s, 10);
  if (isNaN(s)) return "";
  return s <= 2 ? "pemulihan" : "pengayaan";
}
function kemaskiniSusun() {
  var t = tahapMurid();
  $("#susun-belum").hidden = !!t;
  $("#susun-pemulihan").hidden = t !== "pemulihan";
  $("#susun-pengayaan").hidden = t !== "pengayaan";
  if (t) binaPengukuhan(t);
}
document.querySelector('#nav button[data-tab="susun"]').addEventListener("click", kemaskiniSusun);
$("#susun-ke-l3").onclick = function () { document.querySelector('#nav button[data-tab="l3"]').click(); };
kemaskiniSusun();

/* ====================== PENUTUP: TIKET REFLEKSI (borang) ====================== */
function isiNamaTiket() {
  if (muridNama && !$("#p-nama").value) $("#p-nama").value = muridNama;
  if (muridKelas && !$("#p-kelas").value) $("#p-kelas").value = muridKelas;
}
document.querySelector('#nav button[data-tab="penutup"]').addEventListener("click", isiNamaTiket);
$("#tiket").addEventListener("submit", function (ev) {
  ev.preventDefault();
  var fb = $("#t-fb");
  var nama = $("#p-nama").value.trim(), kelas = $("#p-kelas").value.trim();
  var q1 = document.querySelector('input[name="q1"]:checked'), q4 = document.querySelector('input[name="q4"]:checked');
  var q2 = $("#p-q2").value.trim(), q3 = $("#p-q3").value.trim();
  document.querySelectorAll(".t-soalan").forEach(function (x) { x.classList.remove("kurang"); });
  var tiada = [];
  if (!q1) tiada.push("q1"); if (!q2) tiada.push("q2"); if (!q3) tiada.push("q3"); if (!q4) tiada.push("q4");
  if (!nama || !kelas) { fb.className = "fb bad"; fb.textContent = "Sila isi nama dan kelas anda."; (nama ? $("#p-kelas") : $("#p-nama")).focus(); return; }
  if (tiada.length) {
    tiada.forEach(function (id) { document.querySelector('.t-soalan[data-s="' + id + '"]').classList.add("kurang"); });
    document.querySelector('.t-soalan[data-s="' + tiada[0] + '"]').scrollIntoView({ behavior: "smooth", block: "center" });
    fb.className = "fb bad"; fb.textContent = "Sila jawab semua soalan dahulu."; return;
  }
  var dihantar = hantarKeSheet("Penutup", {
    nama: nama, kelas: kelas,
    q1_kefahaman_sup_kok: q1.value,
    q2_kepentingan_perpaduan: q2,
    q3_paling_diingat: q3,
    q4_perasaan_kefahaman: q4.value
  });
  $("#t-hantar").disabled = true;
  document.querySelectorAll("#tiket input, #tiket textarea").forEach(function (x) { x.disabled = true; });
  fb.className = "fb ok"; fb.textContent = "Terima kasih! Tiket anda telah dihantar. 👍";
  if (!dihantar) { var n = $("#t-nota"); n.hidden = false; n.textContent = "(Mod ujian: SHEET_URL belum diisi, jadi jawapan belum dihantar ke Google Sheets.)"; }
  var t = $("#t-tamat"); t.hidden = false; tunjukIkon(true);
  if (dihantar) bunyi.selesai();
  setTimeout(function () { t.scrollIntoView({ behavior: "smooth", block: "center" }); }, 400);
});

/* ====================== AKTIVITI PENGUKUHAN: butang Teruskan ke Penutup ====================== */
document.querySelectorAll(".btn-ke-penutup").forEach(function (b) {
  b.onclick = function () { document.querySelector('#nav button[data-tab="penutup"]').click(); };
});

kemaskiniTema();
// Penutup: buang tanda merah pada soalan sebaik murid menjawabnya
document.querySelectorAll("#tiket .t-soalan").forEach(function (x) {
  x.addEventListener("input", function () { x.classList.remove("kurang"); });
  x.addEventListener("change", function () { x.classList.remove("kurang"); });
});

/* Langkah 3: matikan salin / tampal */
(function () {
  var sekat = function (e) { e.preventDefault(); };
  var kawasan = document.querySelectorAll("#l3-teks, #l3 textarea");
  kawasan.forEach(function (el) {
    ["copy", "cut", "paste", "contextmenu", "dragstart"].forEach(function (n) {
      el.addEventListener(n, sekat);
    });
  });
})();