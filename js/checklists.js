/* Daftar kendaraan & item checklist (disalin dari logbook fisik).
   k: 'cond' = Baik/Rusak | 'fill' = Penuh/Kurang | 'fuel' = bar bahan bakar 1-6 | 'val' = isian angka/teks */
(function () {
  const C = (n, q) => ({ n, q, k: 'cond' });
  const F = (n, q) => ({ n, q, k: 'fill' });
  const B = (n, q) => ({ n, q, k: 'fuel' }); // bar bahan bakar 1-6 (level 1 = merah / kurang)
  const V = (n, u) => ({ n, q: '', k: 'val', u });
  const sak = (arr) => arr.map((n) => C(n, '1 Saklar'));

  const VEHICLES = [
    { kode: 'F1', nama: 'Scania / Foam Tender', jenis: 'Foam Tender' },
    { kode: 'F2', nama: 'Hino / Foam Tender', jenis: 'Foam Tender' },
    { kode: 'A1', nama: 'Suzuki APV / Ambulance', jenis: 'Ambulance' },
    { kode: 'A2', nama: 'KIA Travello / Ambulance', jenis: 'Ambulance' },
    { kode: 'WT', nama: 'Isuzu Elf / Water Tank Car', jenis: 'Water Tank' },
    { kode: 'C1', nama: 'Toyota Hilux / Nurse Tender', jenis: 'Nurse Tender' }
  ];

  const ambCabin = [
    ...sak(['Lampu depan', 'Lampu weser', 'Lampu tanda hati-hati', 'Lampu rotari', 'Klakson kecil', 'Sirine', 'Wipper']),
    C('Lampu sorot', '1 Buah'), C('Radio komunikasi', '1 Buah'), C('Radiator', '1 Buah')
  ];
  const ambFluids = [
    B('Bahan bakar', 'liter'), F('Oli mesin', 'liter'), F('Oli power steering', 'liter'), F('Air radiator', 'liter')
  ];

  const CHECKLISTS = {
    F1: [
      { title: 'Pemeriksaan sebelum menyalakan mesin', items: [F('Oli mesin'), F('Oli power steering'), F('Transmisi'), B('Bahan bakar')] },
      { title: 'Pemeriksaan setelah menghidupkan mesin', items: [
        V('Tekanan tabung (1)', 'psi'), V('Tekanan tabung (2)', 'psi'), V('Tekanan tabung (P)', 'psi'),
        V('Suhu oli gearbox', '°C'), V('Tegangan baterai', 'V'), V('Konsumsi bahan bakar', ' l/h')
      ] },
      { title: 'Jumlah bahan pemadam', items: [F('Foam', '500 Liter'), F('Dry powder', '250 Kg'), F('Air', '4000 Liter')] },
      { title: 'Ruangan cabin pengemudi', items: [
        ...sak(['Lampu depan', 'Lampu weser', 'Lampu tanda hati-hati', 'Lampu rotari', 'Klakson trompet', 'Klakson kecil', 'Sirine', 'Wipper', 'Lampu sorot', 'Radio komunikasi']),
        C('Baju tahan api', '5 Set')
      ] },
      { title: 'Ruangan cabin kanan', items: [
        C('Tabung BAZ', '2 Unit'), C('Tabung nitrogen', '1 Unit'), C('Hose reel DCP / nozzel', '1 Roll'),
        C('Pengukur tekanan', '1 Unit'), C('Handline', '2 Unit'), C('Chainsaw', '1 Unit'), C('Tali', '2 Unit')
      ] },
      { title: 'Ruangan cabin kiri', items: [
        C('Tabung BAZ', '2 Unit'), C('Selang rubber', '6 Roll'), C('Pengukur tekanan', '2 Unit'), C('Suction port', '1 Set'),
        C('Valve hand line', '2 Unit'), C('Kapak besar', '1 Unit'), C('Linggis', '1 Unit'), C('Nozzel', '2 Unit'),
        C('Kunci kopling', '2 Unit'), C('Kapak kecil', '1 Unit'), C('Palu', '1 Unit'), C('Hosereel air', '1 Set'), C('Cutting', '1 Unit')
      ] },
      { title: 'Ruangan cabin belakang', items: [
        C('Selang hidrolik', '1 Unit'), C('Selang rubber', '5 Roll'), C('Terpal', '2 Unit'), C('Pelampung / filter', '1 Unit'),
        C('Wheel chock', '2 Unit'), C('Baju tahan api', '2 Pcs'), C('Fire blanket', '4 Pcs'), C('Cutting hidrolik', '1 Unit'),
        C('Tandu lipat', '2 Set'), C('Compressor BAZ', '1 Unit'), C('Mesin hidrolik', '1 Unit')
      ] },
      { title: 'Ruangan cabin atas', items: [C('Linggis', '1 Unit'), C('Hook', '1 Unit'), C('Tangga', '2 Unit'), C('Selang supply', '2 Unit')] }
    ],
    F2: [
      { title: 'Jumlah bahan kimia', items: [B('Bahan bakar', '200 Liter'), F('Foam', '200 Liter'), F('Dry powder', '250 Kg'), F('Air', '2000 Liter')] },
      { title: 'Ruangan cabin pengemudi', items: [
        ...sak(['Lampu depan', 'Lampu weser', 'Lampu tanda hati-hati', 'Lampu rotari', 'Klakson trompet', 'Sirine', 'Wipper', 'Lampu sorot']),
        C('Radio komunikasi', '1 Unit')
      ] },
      { title: 'Ruangan cabin kanan', items: [
        C('Tabung BAZ', '1 Tabung'), C('Sepatu boots', '2 Pasang'), C('Baju tahan panas', '3 Pcs'), C('Sarung tangan', '3 Pasang'),
        C('Helm', '3 Helm'), C('Tabung nitrogen', '2 Tabung'), C('Hose reel foam / air', '1 Roll'), C('Hose reel DCP / nozzel', '1 Set'),
        C('Fan / belalai', '1 Unit'), C('Pompa hidrolik', '1 Unit'), C('Rantai besi', '1 Unit')
      ] },
      { title: 'Ruangan cabin kiri', items: [
        C('Tabung BAZ', '1 Unit'), C('Sepatu boots', '2 Pasang'), C('Baju tahan panas', '3 Pcs'), C('Sarung tangan', '3 Pasang'),
        C('Helm', '3 Helm'), C('Suction port', '1 Unit'), C('Valve hand line', '2 Unit'), C('Hidran suplai', '1 Unit'),
        C('Sambungan nozzel', '2 Unit'), C('Nozzel', '2 Unit'), C('Kunci kopling', '7 Set'), C('Tandu lipat', '2 Unit'),
        C('Entri suit', '3 Pcs'), C('Kompresor', '1 Unit'), C('Fire blanket', '2 Pcs')
      ] },
      { title: 'Ruangan cabin belakang', items: [
        C('Selang hidrolik', '1 Unit'), C('Tali tambang', '1 Unit'), C('Selang rubber', '9 Roll'), C('Terpal', '1 Pcs'),
        C('Dongkrak', '1 Unit'), C('Pemotong kawat', '1 Unit'), C('Kapak besar', '1 Unit'), C('Linggis (crowbar)', '1 Unit'),
        C('Cutting hidrolik', '1 Unit'), C('Kapak kecil', '1 Unit'), C('Sepatu boots', '2 Pasang'), C('Apar', '1 Unit')
      ] },
      { title: 'Ruangan cabin atas', items: [C('Selang suction', '3 Unit'), C('Hook', '1 Unit'), C('Tangga', '1 Unit'), C('Turret', '2 Unit')] }
    ],
    A2: [
      { title: 'Jumlah bahan bakar & cairan', items: ambFluids },
      { title: 'Ruangan cabin pengemudi', items: ambCabin },
      { title: 'Perlengkapan kendaraan', items: [C('Kunci roda', '1 Unit'), C('Dongkrak', '1 Unit'), C('Ban cadangan', '1 Buah')] },
      { title: 'Perlengkapan medis', items: [
        C('Monitor', '1 Paket'), C('Tensi meter', '1 Buah'), C('Tabung oksigen', '1 Buah'), C('Ambu bag', '2 Buah'), C('Pen light', '1 Buah'),
        C('Alat bedah', '1 Set'), C('Kasa steril', '2 Unit'), C('Alkes gigi', '1 Paket'), C('Thermometer elektrik', '1 Buah'),
        C('Kapas', '3 Buah'), C('Kapas alkohol', '16 Buah'), C('Burn free / penanganan luka bakar', '1 Paket'),
        C('Winged infusion set', '4 Set'), C('Bidai / pembalut 10 cm', '1 Buah'), C('Bidai / pembalut 7,5 cm', '1 Buah'),
        C('Handschoen steril', '3 Buah'), C('Plester', '2 Buah'), C('Slang infus', '4 Buah'), C('Reflex hummer', '1 Buah'),
        C('Guedel airway', '1 Paket'), C('Penyangga leher', '1 Set'), C('Tandu', '2 Buah'), C('Stetoskop', '2 Buah'), C('Kantong mayat', '10 Buah')
      ] }
    ],
    A1: [
      { title: 'Jumlah bahan bakar & cairan', items: ambFluids },
      { title: 'Ruangan cabin pengemudi', items: ambCabin },
      { title: 'Perlengkapan medis', items: [
        C('Tabung O2', '2 Buah'), C('Pinset sirugis', '1 Buah'), C('Detol antiseptik', '1 Botol'), C('Bidai / pembalut elastis', '1 Buah'),
        C('Plester', '1 Buah'), C('Tandu', '3 Buah'), C('Canul nasal', '2 Buah'), C('Masker oksigen', '2 Buah'), C('Ambu bag', '2 Buah'),
        C('Orofarigeal', '2 Buah'), C('Tali tandu', '2 Buah'), C('Kapas', '1 Kantong')
      ] },
      { title: 'Perlengkapan kendaraan', items: [C('Kunci roda', '1 Unit'), C('Dongkrak', '1 Unit'), C('Selang suplai', '3 Buah'), C('Ban cadangan', '1 Buah')] }
    ],
    WT: [
      { title: 'Ruangan cabin pengemudi', items: [
        ...sak(['Lampu depan', 'Lampu weser', 'Lampu tanda hati-hati', 'Lampu rotari', 'Lampu serine', 'Klakson', 'Sirine', 'Wipper']),
        C('Ban depan dan belakang', '4 Buah'), C('Ban reseraf', '1 Buah'), C('Dongkrak', '1 Buah'), C('Kunci roda', '4 Buah'),
        C('Accu', '2 Buah'), C('Minyak rem', '1 Buah'), C('Filter udara', '1 Buah'), C('Filter solar', '1 Buah'), C('Helmet', '1 Buah'),
        C('Baju tahan panas', '1 Buah'), C('Sepatu boots', '1 Buah'), C('Sarung tangan', '1 Buah')
      ] },
      { title: 'Peralatan tambahan', items: [C('Selang pemancar 30 M', '3 Buah'), C('Nozzel', '1 Buah'), C('Selang spiral', '10 M'), C('Stop kran', '1 Buah')] }
    ],
    // Nurse Tender: Toyota Hilux (log book C1)
    C1: [
      { title: 'Jumlah bahan bakar & cairan', items: ambFluids },
      { title: 'Ruangan cabin pengemudi', items: [
        ...sak(['Lampu depan', 'Lampu weser', 'Lampu tanda hati-hati', 'Lampu rotari', 'Klakson kecil', 'Sirine', 'Wipper']),
        C('Lampu sorot', '1 Buah'), C('Radio komunikasi', '1 Buah')
      ] },
      { title: 'Perlengkapan kendaraan', items: [C('Kunci roda', '1 Unit'), C('Dongkrak', '1 Unit'), C('APAR', '3 Buah'), C('Ban cadangan', '1 Buah')] }
    ]
  };

  window.VEHICLES = VEHICLES;
  window.CHECKLISTS = CHECKLISTS;
})();
