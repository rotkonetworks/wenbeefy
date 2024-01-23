import { defineConfig } from "@solidjs/start/config";
import { presetUno, presetIcons } from "unocss";
import Unocss from "unocss/vite";

export default defineConfig({
    plugins: [
        Unocss({
          presets: [
            presetUno(),
            presetIcons({
              prefix: 'i-',
              scale: 1,
              extraProperties: {
                display: 'inline-block'
              }
            })
          ],
          variants: presetUno().variants
        })
    ]
});
