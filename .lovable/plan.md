## Replace sidebar logo with RE Sustainability logo

Update `src/components/layout/Sidebar.tsx` (lines ~155–158): replace the gradient "V" tile with an `<img>` of the existing `src/assets/re-sustainability-logo.png` asset.

- Import `reLogo from '@/assets/re-sustainability-logo.png'`
- Swap the `w-9 h-9 rounded-xl bg-gradient-to-br ...` tile for a white-background tile (`bg-white`) with `<img src={reLogo} className="w-full h-full object-contain p-0.5" alt="RE Sustainability" />` so the colored logo is readable on the dark sidebar.
- Keep "VisiGuard / Enterprise VMS" text and collapse behavior unchanged.

No other components touched.
