import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <Box
      component="img"
      src={`${import.meta.env.BASE_URL}favicon.svg`}
      alt=""
      sx={{ width: size, height: size, display: 'block', borderRadius: `${size / 4}px` }}
    />
  );
}

export function Brand({ hideTextOnMobile = false }: { hideTextOnMobile?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Logo />
      <Typography
        variant="h6"
        component="span"
        sx={{
          fontWeight: 700,
          letterSpacing: 0.2,
          display: hideTextOnMobile ? { xs: 'none', sm: 'inline' } : 'inline',
        }}
      >
        LaterPad
      </Typography>
    </Box>
  );
}
