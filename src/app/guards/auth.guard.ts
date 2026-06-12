import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
    constructor(private router: Router) {}

    canActivate(): boolean {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            if (!token || !user) {
                this.router.navigate(['/login']);
                return false;
            }
        }
        return true;
    }
}