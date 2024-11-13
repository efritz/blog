import numpy as np
import matplotlib.pyplot as plt
from scipy.interpolate import CubicSpline
from matplotlib import cm

points = [
    {'complexity': 0.1, 'familiarity': 0.9, 'friction': 0.2, 'label': 'Program in Go'},
    {'complexity': 0.2, 'familiarity': 1.0, 'friction': 0.7, 'label': 'Program in Bash'},
    {'complexity': 0.0, 'familiarity': 0.6, 'friction': 0.3, 'label': 'Invoke ffmpeg'},
    {'complexity': 0.7, 'familiarity': 0.8, 'friction': 0.4, 'label': 'Build a compiler'},
    {'complexity': 1.0, 'familiarity': 0.7, 'friction': 1.0, 'label': 'Solve P=NP'},
    {'complexity': 0.2, 'familiarity': 0.2, 'friction': 0.3, 'label': 'Center a div'},

    # {'complexity': 1.0, 'familiarity': 1.0, 'friction': 0.0, 'label': 'Xl'},
    # {'complexity': 1.0, 'familiarity': 0.0, 'friction': 0.0, 'label': 'Yl'},


    # {'complexity': 1.0, 'familiarity': 1.0, 'friction': 1.0, 'label': 'Xh'},
    # {'complexity': 1.0, 'familiarity': 0.0, 'friction': 1.0, 'label': 'Yh'},

    # {'complexity': 0.0, 'familiarity': 0.0, 'friction': 1.0, 'label': 'Wh'},



    # {'complexity': 0.6, 'familiarity': 0.8, 'friction': 0.3, 'label': 'Z'},
    # {'complexity': 0.2, 'familiarity': 0.9, 'friction': 0.1, 'label': 'W'},
    # {'complexity': 0.8, 'familiarity': 0.7, 'friction': 1.0, 'label': 'M'},
    # {'complexity': 0.3, 'familiarity': 0.5, 'friction': 0.5, 'label': 'N'}
]

x_points = np.array([p['complexity'] for p in points]) # Complexity
y_points = np.array([p['familiarity'] for p in points]) # Familiarity
z_points = np.array([p['friction'] for p in points]) # Friction
labels = [p['label'] for p in points]

r = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
x_complexity = np.array(r)
y_familiarity = np.array(r)

# Complexity vs friction data (Pre-AI)
f_complexity_pre = np.array([0.4, 0.6, 0.7, 0.8, 0.9, 0.8, 0.7, 0.7, 0.6, 0.3, 0.0])
f_familiarity_pre = np.array([0.0, 0.0, 0.0, 0.1, 0.1, 0.2, 0.3, 0.5, 0.6, 0.8, 0.9])
f_complexity_post = np.array([1.0, 0.9, 0.9, 0.9, 0.9, 0.8, 0.7, 0.7, 0.6, 0.3, 0.0])
f_familiarity_post = np.array([0.0, 0.0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9])

# Create meshgrid for surfaces
X = np.linspace(0, 1, 200)
Y = np.linspace(0, 1, 200)
X_mesh, Y_mesh = np.meshgrid(X, Y)

def make_plot(n, index, title, f_complexity, f_familiarity):
    ax1 = fig.add_subplot(1, n, index, projection='3d')
    ax1.set_title(title)
    ax1.set_xlabel('Complexity')
    ax1.set_ylabel('Familiarity')
    ax1.set_zlabel('Friction')
    ax1.view_init(elev=15, azim=-135)
    ax1.set_xlim(0, 1)
    ax1.set_ylim(0, 1)
    ax1.set_zlim(0, 1)

    # Draw data points
    ax1.scatter(x_points, y_points, z_points, color='black', s=50, depthshade=False)
    for i, txt in enumerate(labels):
        ax1.text(x_points[i], y_points[i], z_points[i], txt, color='black')

    # Draw surface
    ax1.plot_surface(
        X_mesh,
        Y_mesh,
        np.clip(CubicSpline(x_complexity, f_complexity)(X_mesh) * CubicSpline(y_familiarity, f_familiarity)(Y_mesh), 0, 1),
        cmap=cm.viridis,
        alpha=0.8,
        edgecolor='none',
    )

fig = plt.figure(figsize=(14, 6))
make_plot(2, 1, 'Motivation Threshold Before AI Assistance', f_complexity_pre, f_familiarity_pre)
make_plot(2, 2, 'Motivation Threshold After AI Assistance', f_complexity_post, f_familiarity_post)
# make_plot(3, 3, 'Motivation Threshold After AI Assistance (Expected)', friction_hype)
plt.tight_layout()
plt.show()
