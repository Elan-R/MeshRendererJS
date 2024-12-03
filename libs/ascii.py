from itertools import chain as itertools_chain
import json

def chain(*iterables):
    class ChainIterables:
        def __iter__(self):
            return itertools_chain(*iterables)
    return ChainIterables()

def range_in(start, stop):
    return range(start, stop + 1)

def evaluate_font(img_width: int, img_height: int, font_size: float, font_path: str, unicodes: list[int]) -> tuple[list[int], list[float]]:
    from itertools import product
    from PIL import Image, ImageDraw, ImageFont

    img = Image.new("RGB", (img_width, img_height))
    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype(font_path, font_size)

    def pixel_count(text):
        draw.rectangle(((0, 0), (img_width, img_height)), fill="#000000")
        draw.text((0, 0), text, (255, 255, 255), font=font)

        colored = 0
        for coord in product(range(img_width), range(img_height)):
            if img.getpixel(coord) != (0, 0, 0):
                colored += 1

        return colored

    densities = sorted(((i, pixel_count(chr(i))) for i in unicodes), key=lambda x: x[1])
    minimum = densities[0][1]
    maximum = densities[-1][1]

    return tuple(map(list, zip(
        *((unicode, (density - minimum) / (maximum - minimum)) for unicode, density in densities)
    )))

def assign_character(density: float, font_data: tuple[list[int], list[float]], invert_colors: bool) -> str:
    keys, values = font_data

    if invert_colors:
        density = 1 - density

    low = 0
    high = len(values) - 1
    mid = 0

    while low <= high:
        mid = (high + low) // 2

        if values[mid] < density:
            low = mid + 1
        elif values[mid] > density:
            high = mid - 1
        else:
            break

    return chr(keys[mid])

def load_font_data(file):
    font_data = json.load(file)
    font_data[0] = list(map(int, font_data[0]))

    return font_data

if __name__ == "__main__":
    from json import dump
    from tkinter import Tk
    from tkinter.filedialog import askopenfilename

    Tk().withdraw()
    FONT_PATH = askopenfilename()

    WIDTH = 300
    HEIGHT = 300
    FONT_SIZE = 200

    unicodes = {
        "space": range_in(0x0020, 0x0020),
        "basic_latin": range_in(0x0021, 0x007E),
        "latin 1 supplement": range_in(0x00A1, 0x00FF),
        "latin extended a": range_in(0x0100, 0x017F),
        "latin extended b": range_in(0x0180, 0x024F),
        "ipa extensions": range_in(0x0250, 0x02AF),
        "shades": range_in(0x2591, 0x2593)
    }

    CHARACTER_SETS = []

    for name, u_range in unicodes.items():
        if input(f"Include {name} unicode range? [{hex(u_range.start)} to {hex(u_range.stop)}]? [Y/N] ").strip().upper() == "Y":
            CHARACTER_SETS.append(u_range)

    with open("font_data.json", "w") as f:
        dump(evaluate_font(WIDTH, HEIGHT, FONT_SIZE, FONT_PATH, chain(*CHARACTER_SETS)), f)
