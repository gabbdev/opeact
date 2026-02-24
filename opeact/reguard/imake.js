const zlib = require('zlib');

function createImage(width, height, rgbaArray, outputPath) {
	function crc32(buf) {
	let crc = -1;
	for (let i = 0; i < buf.length; i++) {
		crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
	}
	return (crc ^ -1) >>> 0;
	}

	const crcTable = (() => {
	let c;
	const crcTable = [];
	for (let n = 0; n < 256; n++) {
		c = n;
		for (let k = 0; k < 8; k++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		crcTable[n] = c;
	}
	return crcTable;
	})();

	const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

	console.log(crc32(pngSignature))

	const bitDepth = 8;
	const colorType = 6; 
	const compressionMethod = 0;
	const filterMethod = 0;
	const interlaceMethod = 0;

	const ihdrData = Buffer.alloc(13);
	ihdrData.writeUInt32BE(width, 0);
	ihdrData.writeUInt32BE(height, 4);
	ihdrData.writeUInt8(bitDepth, 8);
	ihdrData.writeUInt8(colorType, 9);
	ihdrData.writeUInt8(compressionMethod, 10);
	ihdrData.writeUInt8(filterMethod, 11);
	ihdrData.writeUInt8(interlaceMethod, 12);

	const ihdrLength = Buffer.alloc(4);
	ihdrLength.writeUInt32BE(ihdrData.length, 0);

	const ihdrType = Buffer.from('IHDR');
	const ihdrCRC = Buffer.alloc(4);
	ihdrCRC.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrData])), 0);

	const ihdrChunk = Buffer.concat([ihdrLength, ihdrType, ihdrData, ihdrCRC]);

	const pixels = [];
	for (let y = 0; y < height; y++) {
		pixels.push(0);
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			pixels.push(rgbaArray[idx], rgbaArray[idx + 1], rgbaArray[idx + 2], rgbaArray[idx + 3]);
		}
	}

	const idatData = zlib.deflateSync(Buffer.from(pixels));
	const idatLength = Buffer.alloc(4);
	idatLength.writeUInt32BE(idatData.length, 0);

	const idatType = Buffer.from('IDAT');
	const idatCRC = Buffer.alloc(4);
	idatCRC.writeUInt32BE(crc32(Buffer.concat([idatType, idatData])), 0);

	const idatChunk = Buffer.concat([idatLength, idatType, idatData, idatCRC]);

	const iendData = Buffer.alloc(0);
	const iendLength = Buffer.alloc(4);
	iendLength.writeUInt32BE(iendData.length, 0);

	const iendType = Buffer.from('IEND');
	const iendCRC = Buffer.alloc(4);
	iendCRC.writeUInt32BE(crc32(Buffer.concat([iendType, iendData])), 0);

	const iendChunk = Buffer.concat([iendLength, iendType, iendData, iendCRC]);

	const png = Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);

	return png
}

function extractPixels(pngBuffer) {
    if (pngBuffer.readUInt32BE(0) !== 0x89504E47) throw new Error('Invalid PNG file');
    if (pngBuffer.readUInt32BE(12) !== 0x49484452) throw new Error('Invalid PNG file');

    const width = pngBuffer.readUInt32BE(16);
    const height = pngBuffer.readUInt32BE(20);
    const bitDepth = pngBuffer.readUInt8(24);
    const colorType = pngBuffer.readUInt8(25);
    const compressionMethod = pngBuffer.readUInt8(26);
    const filterMethod = pngBuffer.readUInt8(27);
    const interlaceMethod = pngBuffer.readUInt8(28);

    if (bitDepth !== 8) throw new Error('Unsupported bit depth');
    if (colorType !== 6) throw new Error('Unsupported color type');
    if (compressionMethod !== 0) throw new Error('Unsupported compression method');
    if (filterMethod !== 0) throw new Error('Unsupported filter method: ' + filterMethod);
    if (interlaceMethod !== 0) throw new Error('Unsupported interlace method');

    let offset = 33;
    let idatData = Buffer.alloc(0);
    while (offset < pngBuffer.length) {
        const length = pngBuffer.readUInt32BE(offset);
        const type = pngBuffer.toString('ascii', offset + 4, offset + 8);
        if (type === 'IDAT') {
            idatData = Buffer.concat([idatData, pngBuffer.slice(offset + 8, offset + 8 + length)]);
        }
        offset += 12 + length;
    }
    if (idatData.length === 0) throw new Error('IDAT chunk not found');

    const decompressedData = zlib.inflateSync(idatData);

    const bytesPerPixel = 4;
    const stride = width * bytesPerPixel;
    const pixels = [];

    for (let y = 0; y < height; y++) {
        const filterType = decompressedData[y * (stride + 1)];
        if (filterType === 0) { // None
            for (let x = 0; x < stride; x++) {
                pixels.push(decompressedData[y * (stride + 1) + x + 1]);
            }
        } else if (filterType === 1) { // Sub
            for (let x = 0; x < stride; x++) {
                const recon = decompressedData[y * (stride + 1) + x + 1] + (x >= bytesPerPixel ? pixels[y * stride + x - bytesPerPixel] : 0);
                pixels.push(recon & 0xff);
            }
        } else {
            throw new Error('Unsupported filter method: ' + filterType);
        }
    }

    return { width, height, pixels }
}

module.exports = {
	createImage,
	extractPixels
}
