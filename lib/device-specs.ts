import { normalizeDevice } from './model';

export type DeviceSpec = {
  name: string;
  aliases: string[];
  sourceUrl: string;
  imageUrl: string;
  imageAlt: string;
  released: string;
  dimensions: string;
  weight: string;
  display: string;
  chipset: string;
  camera: string;
  battery: string;
  memory: string;
  protection: string;
};

// Keep this as a small, curated summary rather than mirroring every field from
// the source. Add future models here as the ROM archive grows; the UI stays
// data-driven.
export const deviceSpecs: DeviceSpec[] = [
  {
    name: 'OnePlus 13',
    aliases: ['OnePlus 13', 'Oneplus 13', 'OP 13'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-13',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-13-Blue.webp',
    imageAlt: 'OnePlus 13 với màn hình LTPO AMOLED',
    released: '11/2024',
    dimensions: '162,9 × 76,5 × 8,5 / 8,9 mm',
    weight: '210 / 213 g',
    display: '6,82″ LTPO AMOLED · 120 Hz · 1440 × 3168',
    chipset: 'Snapdragon 8 Elite · Adreno 830',
    camera: '50 MP + 50 MP + 50 MP · selfie 32 MP',
    battery: '6.000 mAh · sạc dây 100 W · không dây 50 W',
    memory: '12 / 16 / 24 GB RAM · 256 GB / 512 GB / 1 TB',
    protection: 'IP68 / IP69 · Android 15 · OxygenOS 15',
  },
  {
    name: 'OnePlus 13R',
    aliases: ['OnePlus 13R', 'Oneplus 13R'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-13r',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-13R-Astral-Trail.webp',
    imageAlt: 'OnePlus 13R màu Astral Trail',
    released: '01/2025',
    dimensions: '161,7 × 75,8 × 8,0 mm',
    weight: '206 g',
    display: '6,78″ LTPO AMOLED · 120 Hz · 1264 × 2780',
    chipset: 'Snapdragon 8 Gen 3 · Adreno 750',
    camera: '50 MP + 50 MP + 8 MP · selfie 16 MP',
    battery: '6.000 mAh · sạc dây 80 W',
    memory: '12 / 16 GB RAM · 256 / 512 GB',
    protection: 'IP65 · Android 15 · OxygenOS 15',
  },
  {
    name: 'OnePlus 13S',
    aliases: ['OnePlus 13S', 'Oneplus 13S'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-13s',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-13s-Green-Silk.webp',
    imageAlt: 'OnePlus 13S màu Green Silk',
    released: '06/2025',
    dimensions: '150,8 × 71,7 × 8,2 mm',
    weight: '185 g',
    display: '6,32″ LTPO AMOLED · 120 Hz · 1216 × 2640',
    chipset: 'Snapdragon 8 Elite · Adreno 830',
    camera: '50 MP + 50 MP · selfie 32 MP AF',
    battery: '5.850 mAh · sạc dây 80 W',
    memory: '12 GB RAM · 256 / 512 GB',
    protection: 'IP65 · Android 15 · OxygenOS 15',
  },
  {
    name: 'OnePlus 13T',
    aliases: ['OnePlus 13T', 'Oneplus 13T'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-13t',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-13T-Gray.webp',
    imageAlt: 'OnePlus 13T màu xám',
    released: '04/2025',
    dimensions: '150,8 × 71,7 × 8,2 mm',
    weight: '185 g',
    display: '6,32″ AMOLED · 120 Hz · 1216 × 2640',
    chipset: 'Snapdragon 8 Elite · Adreno 830',
    camera: '50 MP + 50 MP · selfie 32 MP',
    battery: '6.260 mAh · sạc dây 80 W',
    memory: '12 / 16 GB RAM · 256 / 512 GB / 1 TB',
    protection: 'IP65 · Android 15 · OxygenOS 15 / ColorOS 15',
  },
  {
    name: 'OnePlus 15',
    aliases: ['OnePlus 15', 'Oneplus 15'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-15',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-15-Purple.webp',
    imageAlt: 'OnePlus 15 màu tím',
    released: '10/2025',
    dimensions: '161,4 × 76,7 × 8,1 mm',
    weight: '211 / 215 g',
    display: '6,78″ LTPO AMOLED · 165 Hz · 1272 × 2772',
    chipset: 'Snapdragon 8 Elite Gen 5 · Adreno 840',
    camera: '50 MP + 50 MP + 50 MP · selfie 32 MP',
    battery: '7.300 mAh · sạc dây 120 W',
    memory: '12 / 16 GB RAM · 256 / 512 GB / 1 TB',
    protection: 'IP69 · Android 16 · OxygenOS 16 / ColorOS 16',
  },
  {
    name: 'OnePlus 15R',
    aliases: ['OnePlus 15R', 'Oneplus 15R'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-15r',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-15R-Mint-Breeze.webp',
    imageAlt: 'OnePlus 15R màu Mint Breeze',
    released: '01/2026',
    dimensions: '163,4 × 77,0 × 8,3 mm',
    weight: '213 / 219 g',
    display: '6,83″ AMOLED · 165 Hz · 1272 × 2800',
    chipset: 'Snapdragon 8 Gen 5',
    camera: '50 MP + 8 MP · selfie 32 MP AF',
    battery: '7.400 mAh · sạc dây 80 W',
    memory: '12 GB RAM · 256 / 512 GB',
    protection: 'IP69K · Android 16 · OxygenOS 16',
  },
  {
    name: 'OnePlus 15T',
    aliases: ['OnePlus 15T', 'Oneplus 15T'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-15t',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-15T-Green.webp',
    imageAlt: 'OnePlus 15T màu xanh',
    released: '03/2026',
    dimensions: '150,6 × 71,8 × 8,35 mm',
    weight: '194 g',
    display: '6,32″ OLED · 165 Hz · 1216 × 2640',
    chipset: 'Snapdragon 8 Elite Gen 5 · Adreno 840',
    camera: '50 MP + 50 MP · selfie 16 MP',
    battery: '7.500 mAh · sạc dây 100 W · không dây 50 W',
    memory: '12 / 16 GB RAM · 256 / 512 GB / 1 TB',
    protection: 'IP69 · Android 16 · ColorOS 16',
  },
  {
    name: 'OnePlus Ace 5',
    aliases: ['OnePlus Ace 5', 'Oneplus Ace 5'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-ace-5',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-Ace-5-Black.webp',
    imageAlt: 'OnePlus Ace 5 màu đen',
    released: '12/2024',
    dimensions: '161,7 × 75,8 × 8,1 mm',
    weight: '206 / 223 g',
    display: '6,78″ LTPO AMOLED · 120 Hz · 1264 × 2780',
    chipset: 'Snapdragon 8 Gen 3 · Adreno 750',
    camera: '50 MP + 8 MP + 2 MP · selfie 16 MP',
    battery: '6.415 mAh · sạc dây 80 W',
    memory: '12 / 16 GB RAM · 256 / 512 GB / 1 TB',
    protection: 'IP65 · Android 15 · ColorOS 15',
  },
  {
    name: 'OnePlus Ace 5 Pro',
    aliases: ['OnePlus Ace 5 Pro', 'Oneplus Ace 5 Pro'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-ace-5-pro',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-Ace-5-Pro-Purple.webp',
    imageAlt: 'OnePlus Ace 5 Pro màu tím',
    released: '12/2024',
    dimensions: '161,7 × 75,8 × 8,1 mm',
    weight: '203 / 217 g',
    display: '6,78″ AMOLED · 120 Hz · 1264 × 2780',
    chipset: 'Snapdragon 8 Elite · Adreno 830',
    camera: '50 MP + 8 MP + 2 MP · selfie 16 MP',
    battery: '6.100 mAh · sạc dây 100 W',
    memory: '12 / 16 GB RAM · 256 / 512 GB / 1 TB',
    protection: 'IP65 · Android 15 · ColorOS 15',
  },
  {
    name: 'OnePlus Ace 6',
    aliases: ['OnePlus Ace 6', 'Oneplus Ace 6'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-ace-6',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-Ace-6-Silver.webp',
    imageAlt: 'OnePlus Ace 6 màu bạc',
    released: '10/2025',
    dimensions: '163,4 × 77,0 × 8,3 mm',
    weight: '213 g',
    display: '6,83″ LTPO AMOLED · 165 Hz · 1272 × 2800',
    chipset: 'Snapdragon 8 Elite · Adreno 830',
    camera: '50 MP + 8 MP · selfie 16 MP',
    battery: '7.800 mAh · sạc dây 120 W',
    memory: '12 / 16 GB RAM · 256 / 512 GB / 1 TB',
    protection: 'IP68 / IP69K · Android 16 · ColorOS 16',
  },
  {
    name: 'OnePlus Ace 6T',
    aliases: ['OnePlus Ace 6T', 'Oneplus Ace 6T'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-ace-6t',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-Ace-6T-Green.webp',
    imageAlt: 'OnePlus Ace 6T màu xanh',
    released: '12/2025',
    dimensions: '163,4 × 77,0 × 8,1 / 8,3 mm',
    weight: '211 / 216 / 217 g',
    display: '6,83″ AMOLED · 165 Hz · 1272 × 2800',
    chipset: 'Snapdragon 8 Gen 5',
    camera: '50 MP + 8 MP · selfie 16 MP',
    battery: '8.300 mAh · sạc dây 100 W',
    memory: '12 / 16 GB RAM · 256 / 512 GB / 1 TB',
    protection: 'IP69K · Android 16 · ColorOS 16',
  },
  {
    name: 'OnePlus Pad 2 Pro',
    aliases: ['OnePlus Pad 2 Pro', 'Oneplus Pad 2 Pro'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-pad-2-pro',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-Pad-2-Pro.webp',
    imageAlt: 'OnePlus Pad 2 Pro',
    released: '05/2025',
    dimensions: '289,6 × 209,7 × 6,0 mm',
    weight: '675 g',
    display: '13,2″ IPS LCD · 144 Hz · 2400 × 3392',
    chipset: 'Snapdragon 8 Elite · Adreno 830',
    camera: '13 MP sau · selfie 8 MP',
    battery: '12.140 mAh · sạc dây 67 W',
    memory: '8 / 12 / 16 GB RAM · 256 / 512 GB',
    protection: 'Android 15 · ColorOS 15 · 8 loa stereo',
  },
  {
    name: 'OnePlus Pad 3',
    aliases: ['OnePlus Pad 3', 'Oneplus Pad 3'],
    sourceUrl: 'https://www.gsmarena.com.ng/product/oneplus-pad-3',
    imageUrl:
      'https://www.gsmarena.com.ng/uploads/products/OnePlus-Pad-3-Storm-Blue.webp',
    imageAlt: 'OnePlus Pad 3 màu Storm Blue',
    released: '06/2025',
    dimensions: '289,6 × 209,7 × 6,0 mm',
    weight: '675 g',
    display: '13,2″ IPS LCD · 144 Hz · 2400 × 3392',
    chipset: 'Snapdragon 8 Elite · Adreno 830',
    camera: '13 MP sau · selfie 8 MP',
    battery: '12.140 mAh · sạc dây 80 W',
    memory: '12 / 16 GB RAM · 256 / 512 GB',
    protection: 'Android 15 · ColorOS 15 · 8 loa stereo',
  },
];

export function deviceSpecFor(device: string) {
  const normalized = normalizeDevice(device);
  return deviceSpecs.find((spec) =>
    spec.aliases.some((alias) => normalizeDevice(alias) === normalized),
  );
}
