# M-0086 — локальный test suite: память, время, детерминизм

- Девять запусков: 3× synthetic regression, 3× baseline, 3× experimental на одном замороженном Gold SHA256 E5073D25DEA44D91FC67A01B727C9427740FC7E5C13528281DA965DFD5A17916.
- Node v24.15.0, win32/x64; RAM 15.74 GiB; логических CPU 12.
- Пиковая наблюдаемая RSS **77.570 MiB**, ограничение *V8 old-space* **384 MiB** (не общий RSS), порог сигнализации **512 MiB**, timeout **120 s на процесс**.
- Общее измеренное wall time: **3.314 s**. Память измерена с интервалом 20 ms только в верхнеуровневом Node-процессе, дочерние процессы отсутствуют в этих измерениях.
- synthetic: n=3, median 356.011 ms, max 422.247 ms, peakRSS 77.57 MiB, stable SHA256 E5FBB18CDEE21B1DF5E046D897E7FF1E8C56CDA5A7B4BA0271020B0105C7D671; gate SYNTHETIC_PASS.
- baseline: n=3, median 378.897 ms, max 392.606 ms, peakRSS 76.625 MiB, stable SHA256 FE03F96EFC36B74145123498912355B5516EA101F7E390FDC09BDBC89F914D73; gate INCONCLUSIVE_INSUFFICIENT_GOLD.
- experimental: n=3, median 348.017 ms, max 375.224 ms, peakRSS 76.68 MiB, stable SHA256 585E8F7FC0E8D1446A4B3866C5E1A681C09041C9CE925402D9CFD87E1EF3B970; gate INCONCLUSIVE_INSUFFICIENT_GOLD.
- Повторяемость **PASS** на одной машине и неизменном снимке, но качество поиска **INCONCLUSIVE**: baseline 3/10 и experimental 0/10 полностью оценённых сравнений; Recall@20 N/A.
- SQL, production, Git, индексированный поиск ARI-03 не изменены.
