import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QueryParamManagerService } from './query-param-manager.service';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements AfterViewInit, OnDestroy {
  name = 'XDDDDDDDD';
  stop$ = new Subject();

  control = new FormControl('');

  constructor(private queryManager: QueryParamManagerService) {
    this.queryManager.params$.pipe(takeUntil(this.stop$)).subscribe(params => {
      // console.log(params);
    });
  }

  ngOnDestroy(): void {
    this.stop$.next(true);
    this.stop$.complete();
  }

  ngAfterViewInit(): void {
    this.queryManager
      .addFormControl(this.control, 'control')
      .takeUntil(this.stop$)
      .sync();
  }
}
