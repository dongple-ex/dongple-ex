import sys
from PIL import Image, ImageDraw

def remove_background(input_path, output_path):
    # Load image and convert to RGBA
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # We will perform flood fill from the four corners to make the white background transparent.
    # We use a threshold to account for anti-aliasing / compression near the edges.
    # Since ImageDraw.floodfill might not support threshold in older Pillow versions,
    # let's implement a simple BFS flood fill or use ImageDraw.floodfill if available.
    
    # Let's write a robust flood fill with tolerance
    data = img.load()
    visited = set()
    
    # Target color to replace (white)
    target_color = (255, 255, 255, 255)
    tolerance = 30 # tolerance for near-white pixels
    
    def is_similar(c1, c2):
        # c1 and c2 are tuples of (R, G, B, A)
        return abs(c1[0] - c2[0]) < tolerance and abs(c1[1] - c2[1]) < tolerance and abs(c1[2] - c2[2]) < tolerance
        
    # Start points: the four corners
    starts = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
    
    # Also include points along the edges to make sure we catch everything
    for x in range(width):
        starts.append((x, 0))
        starts.append((x, height - 1))
    for y in range(height):
        starts.append((0, y))
        starts.append((width - 1, y))
        
    queue = []
    for pt in starts:
        current_color = data[pt[0], pt[1]]
        if is_similar(current_color, target_color) and pt not in visited:
            queue.append(pt)
            visited.add(pt)
            
    # BFS
    while queue:
        cx, cy = queue.pop(0)
        # Make transparent
        data[cx, cy] = (0, 0, 0, 0)
        
        # Check 4-neighbors
        for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < width and 0 <= ny < height:
                if (nx, ny) not in visited:
                    neighbor_color = data[nx, ny]
                    if is_similar(neighbor_color, target_color):
                        visited.add((nx, ny))
                        queue.append((nx, ny))
                        
    # Save the output image
    img.save(output_path, "PNG")
    print("Background removed and saved to", output_path)

if __name__ == "__main__":
    remove_background(
        "c:/dongple_workspace/dongple-ex/public/logo_ex.png",
        "c:/dongple_workspace/dongple-ex/public/logo_ex.png"
    )
