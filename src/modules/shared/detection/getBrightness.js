export const getBrightness = (ImageData)=>{




    const data = ImageData.data;
    let total = 0;
    const pixels = data.length / 4;
    for (let i = 0; i < data.length; i += 4) {
      total += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }

    return total / pixels;
  }











