document.addEventListener('DOMContentLoaded', () => {
    // ----- DOM refs -----
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const emptyState = document.getElementById('emptyState');
    const stats = document.getElementById('stats');
    const totalFilesEl = document.getElementById('totalFiles');
    const totalOriginalSizeEl = document.getElementById('totalOriginalSize');
    const totalCompressedSizeEl = document.getElementById('totalCompressedSize');
    const totalSavingsEl = document.getElementById('totalSavings');
    const downloadAllBtn = document.getElementById('downloadAllBtn');
    const downloadAllContainer = document.getElementById('downloadAll');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const outputFormatSelect = document.getElementById('outputFormat');

    // ----- State -----
    let files = [];
    let idCounter = 0;
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

    // ----- Helpers -----
    function formatSize(bytes) {
        if (bytes === 0) return '0 KB';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const val = (bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0);
        return `${val} ${sizes[i]}`;
    }

    function getFileIcon(type) {
        if (type.startsWith('image/')) return 'IMG';
        if (type === 'application/pdf') return 'PDF';
        if (type.startsWith('text/')) return 'TXT';
        if (type === 'application/json') return 'JSON';
        if (type === 'text/csv') return 'CSV';
        return 'DOC';
    }

    function getFileType(file) {
        if (file.type) return file.type;
        const extension = file.name.toLowerCase().split('.').pop();
        const types = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
            gif: 'image/gif',
            svg: 'image/svg+xml',
            pdf: 'application/pdf',
            json: 'application/json',
            xml: 'application/xml',
            csv: 'text/csv',
            txt: 'text/plain',
            html: 'text/html',
            css: 'text/css',
            js: 'application/javascript',
            ts: 'application/typescript'
        };
        return types[extension] || 'application/octet-stream';
    }

    function getLevel() {
        const active = document.querySelector('.level-btn.active');
        return active ? active.dataset.level : 'low';
    }

    function getOutputFormat() {
        return outputFormatSelect.value;
    }

    function getCompressionSettings(level) {
        const settings = {
            low: { imageQuality: 0.9, maxSizeMB: 2, maxWidthOrHeight: 2400, gzipLevel: 3 },
            medium: { imageQuality: 0.75, maxSizeMB: 1, maxWidthOrHeight: 1800, gzipLevel: 6 },
            high: { imageQuality: 0.55, maxSizeMB: 0.5, maxWidthOrHeight: 1200, gzipLevel: 9 }
        };
        return settings[level] || settings.low;
    }

    function isTextType(mime) {
        return /^text\//.test(mime) ||
               mime === 'application/json' ||
               mime === 'application/xml' ||
               mime === 'text/csv' ||
               mime === 'application/javascript' ||
               mime === 'application/typescript' ||
               mime === 'text/html' ||
               mime === 'text/css';
    }

    function canRecompressWithLevel(type) {
        return type.startsWith('image/') || isTextType(type);
    }

    // ----- Render UI -----
    function renderFiles() {
        const items = fileList.querySelectorAll('.file-item');
        items.forEach(el => el.remove());

        if (files.length === 0) {
            emptyState.style.display = 'block';
            stats.style.display = 'none';
            downloadAllContainer.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        stats.style.display = 'grid';
        downloadAllContainer.style.display = 'block';

        files.forEach((f) => {
            const div = document.createElement('div');
            div.className = 'file-item';
            div.dataset.id = f.id;

            const icon = document.createElement('div');
            icon.className = 'file-icon';
            icon.textContent = getFileIcon(f.type);

            const info = document.createElement('div');
            info.className = 'file-info';
            const nameSpan = document.createElement('div');
            nameSpan.className = 'file-name';
            nameSpan.textContent = f.name;
            const meta = document.createElement('div');
            meta.className = 'file-meta';
            const sizeOrig = document.createElement('span');
            sizeOrig.textContent = `Asli: ${formatSize(f.originalSize)}`;
            const sizeComp = document.createElement('span');
            if (f.compressedSize !== undefined && f.compressedSize !== f.originalSize) {
                sizeComp.textContent = `Kompres: ${formatSize(f.compressedSize)}`;
            } else if (f.compressedSize !== undefined) {
                sizeComp.textContent = 'Tidak dikompresi';
            } else {
                sizeComp.textContent = '—';
            }
            meta.appendChild(sizeOrig);
            meta.appendChild(sizeComp);
            info.appendChild(nameSpan);
            info.appendChild(meta);

            const status = document.createElement('div');
            status.className = `file-status ${f.status}`;
            let statusText = '';
            let title = '';
            if (f.status === 'pending') { statusText = '⏳ Antrian'; }
            else if (f.status === 'compressing') { statusText = '⏳ Kompresi...'; }
            else if (f.status === 'done') {
                if (f.compressedSize !== undefined && f.compressedSize < f.originalSize) {
                    statusText = f.compressionType || '✅ Kompres';
                } else {
                    statusText = f.compressionType || '✅ Ukuran sama';
                }
            }
            else if (f.status === 'error') {
                statusText = '❌ Gagal';
                title = f.error || 'Terjadi kesalahan';
            }
            status.textContent = statusText;
            if (title) status.title = title;

            const actions = document.createElement('div');
            actions.className = 'file-actions';

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'download-btn';
            downloadBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2V11M9 11L6 8M9 11L12 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 14H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
            downloadBtn.title = 'Download hasil';
            downloadBtn.disabled = f.status !== 'done';
            downloadBtn.style.opacity = f.status === 'done' ? '1' : '0.4';
            downloadBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (f.status === 'done' && f.compressedBlob) {
                    const a = document.createElement('a');
                    let ext = 'bin';
                    const mime = f.compressedBlob.type;
                    if (mime.includes('/')) {
                        ext = mime.split('/')[1];
                    }
                    if (ext === 'gzip') ext = 'gz';
                    const baseName = f.name.split('.').slice(0, -1).join('.') || 'compressed';
                    a.download = `${baseName}_compressed.${ext}`;
                    a.href = URL.createObjectURL(f.compressedBlob);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
                }
            });
            actions.appendChild(downloadBtn);

            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 5H14M7 5V3H11V5M6 5L6.5 15H11.5L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
            removeBtn.title = 'Hapus file';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileToRemove = files.find(item => item.id === f.id);
                if (fileToRemove) {
                    fileToRemove._deleted = true;
                    fileToRemove._processing = false;
                }
                files = files.filter(item => item.id !== f.id);
                renderFiles();
                updateStats();
            });
            actions.appendChild(removeBtn);

            div.appendChild(icon);
            div.appendChild(info);
            div.appendChild(status);
            div.appendChild(actions);
            fileList.appendChild(div);
        });

        updateStats();
    }

    function updateStats() {
        const total = files.length;
        const origSum = files.reduce((acc, f) => acc + f.originalSize, 0);
        const compSum = files.reduce((acc, f) => acc + (f.compressedSize || 0), 0);
        const doneFiles = files.filter(f => f.status === 'done');
        const allDone = doneFiles.length === total && total > 0;

        totalFilesEl.textContent = total;
        totalOriginalSizeEl.textContent = formatSize(origSum);
        totalCompressedSizeEl.textContent = allDone ? formatSize(compSum) : '—';

        let savings = 0;
        if (allDone && origSum > 0 && compSum > 0) {
            savings = ((origSum - compSum) / origSum) * 100;
            totalSavingsEl.textContent = `${savings.toFixed(1)}%`;
        } else {
            totalSavingsEl.textContent = '—';
        }
    }

    // ----- Compression functions (dengan fallback jika library tidak tersedia) -----
    async function compressImage(file, sourceType, level, outputFormat) {
        if (typeof imageCompression === 'undefined') {
            throw new Error('Library kompresi gambar gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.');
        }
        const settings = getCompressionSettings(level);
        const fileType = outputFormat === 'jpg' ? 'image/jpeg' :
            outputFormat === 'same' && sourceType === 'image/png' ? 'image/webp' :
            outputFormat !== 'same' ? `image/${outputFormat}` : undefined;
        const options = {
            maxSizeMB: settings.maxSizeMB,
            maxWidthOrHeight: settings.maxWidthOrHeight,
            useWebWorker: true,
            fileType,
            quality: settings.imageQuality,
        };
        try {
            const compressed = await imageCompression(file, options);
            if (compressed.size >= file.size) {
                return { blob: file, size: file.size, type: 'unchanged' };
            }
            return { blob: compressed, size: compressed.size, type: 'image' };
        } catch (err) {
            throw new Error(`Gagal kompres gambar: ${err.message}`);
        }
    }

    async function compressText(file, level) {
        if (typeof pako === 'undefined') {
            throw new Error('Library kompresi teks gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.');
        }
        try {
            const text = await file.text();
            const compressed = pako.gzip(text, {
                level: getCompressionSettings(level).gzipLevel
            });
            const blob = new Blob([compressed], { type: 'application/gzip' });
            if (blob.size >= file.size) {
                return { blob: file, size: file.size, type: 'unchanged' };
            }
            return { blob, size: blob.size, type: 'gzip' };
        } catch (err) {
            throw new Error(`Gagal kompres teks: ${err.message}`);
        }
    }

    async function compressPdf(file) {
        if (typeof PDFLib === 'undefined') {
            throw new Error('Library kompresi PDF gagal dimuat. Periksa koneksi internet lalu muat ulang halaman.');
        }
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            const compressedBytes = await pdfDoc.save({
                useObjectStreams: true,
                compress: true,
                update: true
            });
            const blob = new Blob([compressedBytes], { type: 'application/pdf' });
            if (blob.size >= file.size) {
                return { blob: file, size: file.size, type: 'unchanged' };
            }
            return { blob, size: blob.size, type: 'pdf' };
        } catch (err) {
            throw new Error('PDF tidak dapat diproses. File asli tidak diubah.');
        }
    }

    // ----- Main compress function -----
    async function compressFile(fileEntry) {
        const level = getLevel();
        const outFormat = getOutputFormat();
        const file = fileEntry.file;
        const type = fileEntry.type;

        fileEntry._processing = true;
        const initialStatus = fileEntry.status;

        const checkCancelled = () => {
            if (fileEntry._deleted || fileEntry.status !== initialStatus || !fileEntry._processing) {
                return true;
            }
            return false;
        };

        try {
            let result;
            if (type.startsWith('image/')) {
                result = await compressImage(file, type, level, outFormat);
            } else if (type === 'application/pdf') {
                result = await compressPdf(file);
            } else if (isTextType(type)) {
                result = await compressText(file, level);
            } else {
                result = { blob: file, size: file.size, type: 'unsupported' };
            }

            if (checkCancelled()) return { success: false, cancelled: true };

            fileEntry.compressedBlob = result.blob;
            fileEntry.compressedSize = result.size;
            if (result.type === 'image') {
                fileEntry.compressionType = '🖼️ Kompres';
            } else if (result.type === 'gzip') {
                fileEntry.compressionType = '📦 GZIP';
            } else if (result.type === 'pdf') {
                fileEntry.compressionType = '📄 PDF';
            } else if (result.type === 'unchanged') {
                fileEntry.compressionType = '↔️ Ukuran sama';
            } else {
                fileEntry.compressionType = '📋 Format tidak didukung';
            }
            if (result.type === 'unsupported') {
                fileEntry.status = 'error';
                fileEntry.error = 'Format file ini belum didukung untuk kompresi.';
                return { success: false };
            }
            fileEntry.status = 'done';
            fileEntry.error = null;
            return { success: true };
        } catch (err) {
            if (checkCancelled()) return { success: false, cancelled: true };
            fileEntry.status = 'error';
            fileEntry.error = err.message;
            return { success: false };
        } finally {
            fileEntry._processing = false;
        }
    }

    // ----- Process queue -----
    async function processFiles() {
        for (let f of files) {
            if (f.status === 'pending') {
                f.status = 'compressing';
                renderFiles();
                const result = await compressFile(f);
                if (result.cancelled) continue;
                renderFiles();
                updateStats();
            }
        }
    }

    // ----- Add files -----
    function addFiles(fileListFromInput) {
        let hasNew = false;
        for (let file of fileListFromInput) {
            const exists = files.some(f => f.name === file.name && f.size === file.size);
            if (exists) continue;

            if (file.size > MAX_FILE_SIZE) {
                alert(`File "${file.name}" terlalu besar (maks 50 MB).`);
                continue;
            }

            const entry = {
                id: idCounter++,
                file: file,
                name: file.name,
                type: getFileType(file),
                size: file.size,
                originalSize: file.size,
                status: 'pending',
                compressedSize: undefined,
                compressedBlob: null,
                compressionType: null,
                error: null,
                _processing: false,
                _deleted: false
            };
            files.push(entry);
            hasNew = true;
        }

        if (hasNew) {
            renderFiles();
            processFiles();
        } else if (fileListFromInput.length > 0) {
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:#1e1e2f; color:white; padding:12px 24px; border-radius:40px; font-weight:500; box-shadow:0 8px 24px rgba(0,0,0,0.2); z-index:999; animation:fadeIn 0.3s ease;';
            toast.textContent = '⚠️ File sudah ada atau melebihi batas.';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 2500);
        }
    }

    // ----- Download All as ZIP (menggunakan fflate) -----
    async function downloadAllAsZip() {
        const doneFiles = files.filter(f => f.status === 'done' && f.compressedBlob);
        if (doneFiles.length === 0) {
            alert('Belum ada file yang selesai diproses.');
            return;
        }

        const zipData = {};
        for (let f of doneFiles) {
            try {
                const arrayBuffer = await f.compressedBlob.arrayBuffer();
                const baseName = f.name.split('.').slice(0, -1).join('.') || f.name;
                let ext = 'bin';
                const mime = f.compressedBlob.type;
                if (mime.includes('/')) {
                    ext = mime.split('/')[1];
                }
                if (ext === 'gzip') ext = 'gz';
                const filename = `${baseName}_compressed.${ext}`;
                zipData[filename] = new Uint8Array(arrayBuffer);
            } catch (err) {
                console.warn(`Gagal membaca ${f.name}:`, err);
            }
        }

        if (Object.keys(zipData).length === 0) {
            alert('Tidak ada file yang bisa di-zip.');
            return;
        }

        if (typeof fflate === 'undefined') {
            alert('Library fflate tidak tersedia, tidak bisa membuat ZIP.');
            return;
        }

        const zipped = fflate.zipSync(zipData);
        const blob = new Blob([zipped], { type: 'application/zip' });
        const a = document.createElement('a');
        a.download = 'compressed_files.zip';
        a.href = URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }

    // ----- Event Listeners -----
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            addFiles(e.target.files);
        }
        fileInput.value = '';
    });

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
            addFiles(e.dataTransfer.files);
        }
    });

    // Level buttons: reset hanya untuk gambar yang sudah selesai
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            let hasReset = false;
            files.forEach(f => {
                if (canRecompressWithLevel(f.type) && (f.status === 'done' || f.status === 'error')) {
                    f.status = 'pending';
                    f.compressedBlob = null;
                    f.compressedSize = undefined;
                    f._processing = false;
                    hasReset = true;
                } else if (canRecompressWithLevel(f.type) && f.status === 'compressing') {
                    f._processing = false;
                    f.status = 'pending';
                    hasReset = true;
                }
            });
            if (hasReset) {
                renderFiles();
                processFiles();
            }
        });
    });

    // Output format change: reset hanya gambar
    outputFormatSelect.addEventListener('change', () => {
        let hasReset = false;
        files.forEach(f => {
            if (f.type.startsWith('image/') && (f.status === 'done' || f.status === 'error')) {
                f.status = 'pending';
                f.compressedBlob = null;
                f.compressedSize = undefined;
                f._processing = false;
                hasReset = true;
            } else if (f.type.startsWith('image/') && f.status === 'compressing') {
                f._processing = false;
                f.status = 'pending';
                hasReset = true;
            }
        });
        if (hasReset) {
            renderFiles();
            processFiles();
        }
    });

    clearAllBtn.addEventListener('click', () => {
        files.forEach(f => {
            f._deleted = true;
            f._processing = false;
        });
        files = [];
        renderFiles();
        updateStats();
    });

    downloadAllBtn.addEventListener('click', downloadAllAsZip);

    // Inisialisasi
    renderFiles();
});