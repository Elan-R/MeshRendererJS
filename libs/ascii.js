function assignCharacter(density, fontData, invertColors) {
    let [keys, values] = fontData;

    if (invertColors) {
        density = 1 - density;
    }

    let low = 0;
    let high = values.length - 1;
    let mid = 0;

    while (low <= high) {
        mid = Math.floor((high + low) / 2);

        if (values[mid] < density) {
            low = mid + 1;
        } else if (values[mid] > density) {
            high = mid - 1;
        } else {
            break;
        }
    }

    return String.fromCharCode(keys[mid]);
}
