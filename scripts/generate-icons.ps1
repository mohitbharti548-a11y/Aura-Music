
Add-Type -AssemblyName System.Drawing

function CreateIcon($srcPath, $destPath, $size, $isRound, $paddingRatio) {
    $parent = Split-Path -Parent $destPath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $src = [System.Drawing.Image]::FromFile($srcPath)
    $dest = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::FromArgb(7, 7, 9))

    # Optional subtle radial glow background
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point 0, 0),
        (New-Object System.Drawing.Point $size, $size),
        [System.Drawing.Color]::FromArgb(18, 30, 36),
        [System.Drawing.Color]::FromArgb(7, 7, 9)
    )
    $g.FillRectangle($brush, 0, 0, $size, $size)
    $brush.Dispose()

    # Draw emblem
    $targetSize = [int]($size * (1.0 - $paddingRatio))
    $offset = [int](($size - $targetSize) / 2)
    $g.DrawImage($src, $offset, $offset, $targetSize, $targetSize)

    if ($isRound) {
        # Create round mask
        $roundBmp = New-Object System.Drawing.Bitmap $size, $size
        $rg = [System.Drawing.Graphics]::FromImage($roundBmp)
        $rg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $rg.Clear([System.Drawing.Color]::Transparent)

        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $size, $size)
        $texture = New-Object System.Drawing.TextureBrush $dest
        $rg.FillPath($texture, $path)

        $texture.Dispose()
        $path.Dispose()
        $rg.Dispose()
        $dest.Dispose()
        $dest = $roundBmp
    }

    $dest.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
    Write-Host "Generated: $destPath ($size x $size)"
}

$logoMark = Resolve-Path "public/logo-mark.png"

# 1. Android Mipmaps (Square & Round)
$androidRes = "android/app/src/main/res"
$densities = @(
    @{ Name = "mipmap-mdpi"; Size = 48 },
    @{ Name = "mipmap-hdpi"; Size = 72 },
    @{ Name = "mipmap-xhdpi"; Size = 96 },
    @{ Name = "mipmap-xxhdpi"; Size = 144 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192 }
)

foreach ($d in $densities) {
    $dir = Join-Path $androidRes $d.Name
    $icSquare = Join-Path $dir "ic_launcher.png"
    $icRound = Join-Path $dir "ic_launcher_round.png"
    CreateIcon $logoMark $icSquare $d.Size $false 0.15
    CreateIcon $logoMark $icRound $d.Size $true 0.15
}

# 2. Web & PWA Outside Icons
CreateIcon $logoMark "public/favicon.png" 48 $false 0.1
CreateIcon $logoMark "public/favicon.ico" 48 $false 0.1
CreateIcon $logoMark "app/favicon.ico" 48 $false 0.1
CreateIcon $logoMark "public/apple-touch-icon.png" 180 $false 0.15
CreateIcon $logoMark "public/apple-touch-icon-precomposed.png" 180 $false 0.15
CreateIcon $logoMark "public/icons/icon-192.png" 192 $false 0.15
CreateIcon $logoMark "public/icons/icon-512.png" 512 $false 0.15
CreateIcon $logoMark "public/icons/maskable-512.png" 512 $false 0.25
