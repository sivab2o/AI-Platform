import {
  Inject,
  Injectable,
  PLATFORM_ID
} from '@angular/core';

import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot
} from '@angular/router';

import {
  isPlatformBrowser
} from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private router: Router,

    @Inject(PLATFORM_ID)
    private platformId: Object
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {

    // During Angular server rendering, localStorage
    // is unavailable. Allow rendering to continue.
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    const token =
      localStorage.getItem('token');

    const storedUser =
      localStorage.getItem('user');

    if (!token || !storedUser) {
      this.router.navigate(['/login']);
      return false;
    }

    try {
      const user = JSON.parse(storedUser);

      if (
        user.role === 'admin' &&
        user.status === 'active'
      ) {
        return true;
      }

      if (user.role === 'owner') {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/login']);
      }

      return false;

    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      this.router.navigate(['/login']);
      return false;
    }
  }
}