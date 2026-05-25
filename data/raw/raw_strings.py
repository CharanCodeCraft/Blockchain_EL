import numpy as np

pts = np.load("/home/charan/Desktop/IDP/data/raw/plaintexts.npy")

def bytes_to_string(arr):
    return ''.join([chr(x) for x in arr if x != 0])

for i in range(5):
    print(bytes_to_string(pts[i]))