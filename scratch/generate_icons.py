import os
from PIL import Image

def generate_icons():
    base_dir = "c:/dongple_workspace/dongple-ex"
    logo_path = os.path.join(base_dir, "public/logo-ex.png")
    
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found.")
        return
        
    # Open the source image
    img = Image.open(logo_path).convert("RGBA")
    
    # 1. Generate icon.png (512x512)
    icon_path = os.path.join(base_dir, "src/app/icon.png")
    icon_img = img.resize((512, 512), Image.Resampling.LANCZOS)
    icon_img.save(icon_path, "PNG")
    print(f"Generated: {icon_path} (512x512)")
    
    # 2. Generate apple-icon.png (180x180)
    apple_icon_path = os.path.join(base_dir, "src/app/apple-icon.png")
    apple_img = img.resize((180, 180), Image.Resampling.LANCZOS)
    apple_img.save(apple_icon_path, "PNG")
    print(f"Generated: {apple_icon_path} (180x180)")
    
    # 3. Generate favicon.ico (Multi-size: 16x16, 32x32, 48x48)
    favicon_path = os.path.join(base_dir, "src/app/favicon.ico")
    img.save(favicon_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
    print(f"Generated: {favicon_path} (ICO)")

if __name__ == "__main__":
    generate_icons()
