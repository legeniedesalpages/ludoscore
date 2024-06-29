/**
    * @description      : 
    * @author           : renau
    * @group            : 
    * @created          : 29/06/2024 - 14:51:03
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 29/06/2024
    * - Author          : renau
    * - Modification    : 
**/
import {
  AfterViewInit,
  Component,
  DoCheck,
  ElementRef,
  Input,
  OnInit,
  ViewChild
} from "@angular/core";
import { Navigate } from "@ngxs/router-plugin";
import { Store } from "@ngxs/store";
const COLORS = ["#f82", "#0bf", "#fb0", "#0fb", "#b0f", "#f0b", "#bf0"];

@Component({
  selector: "app-wheel",
  templateUrl: "./wheel.component.html",
  styleUrls: ["./wheel.component.css"]
})
export class WheelComponent implements OnInit, AfterViewInit, DoCheck {

  @ViewChild("wheel") wheel: ElementRef<HTMLCanvasElement> | undefined;
  @ViewChild("spin") spin: ElementRef | undefined;
  colors = ["#f82", "#0bf", "#fb0", "#0fb", "#b0f", "#f0b", "#bf0"];
  sectors: any[] = [];

  rand = (m: any, M: any) => Math.random() * (M - m) + m;

  tot: any;
  ctx: any;
  dia: any;
  rad: any;
  PI: any;
  TAU: any;
  arc0: any;

  winners = [];

  modeDelete = true;

  friction = this.rand(0.992, 0.997); // 0.995=soft, 0.99=mid, 0.98=hard
  angVel = 0; // Angular velocity
  ang = 0; // Angle in radians
  lastSelection: any;

  constructor(private store: Store) {
    let values = ["renaud", "ancé"];
    this.sectors = values.map((opts, i) => {
      return {
        color: COLORS[(i >= COLORS.length ? i + 1 : i) % COLORS.length],
        label: opts
      };
    });

    console.log(this.sectors);
    if (this.wheel) {
      this.createWheel();
    }
  }
  ngDoCheck(): void {
    this.engine();
  }

  ngOnInit() {
  }

  ngAfterViewInit(): void {
    this.createWheel();
  }

  createWheel() {
    if (this.wheel) {
      this.ctx = this.wheel.nativeElement.getContext("2d");
      this.dia = this.ctx.canvas.width;
      this.tot = this.sectors.length;
      this.rad = this.dia / 2;
      this.PI = Math.PI;
      this.TAU = 2 * this.PI;

      this.arc0 = this.TAU / this.sectors.length;
      this.sectors.forEach((sector, i) => this.drawSector(sector, i));
      this.rotate(true);
    }
  }

  spinner() {
    if (!this.angVel) this.angVel = this.rand(0.25, 0.35);
  }

  getIndex = () =>
    Math.floor(this.tot - (this.ang / this.TAU) * this.tot) % this.tot;

  drawSector(sector: { color: any; label: any; }, i: number) {
    const ang = this.arc0 * i;
    this.ctx.save();
    // COLOR
    this.ctx.beginPath();
    this.ctx.fillStyle = sector.color;
    this.ctx.moveTo(this.rad, this.rad);

    this.ctx.arc(this.rad, this.rad, this.rad, ang, ang + this.arc0);
    this.ctx.lineTo(this.rad, this.rad);
    this.ctx.fill();
    // TEXT
    this.ctx.translate(this.rad, this.rad);
    this.ctx.rotate(ang + this.arc0 / 2);
    this.ctx.textAlign = "right";
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "bold 30px sans-serif";
    this.ctx.fillText(sector.label, this.rad - 10, 10);
    //
    this.ctx.restore();
  }

  rotate(first = false) {
    const sector = this.sectors[this.getIndex()];
    this.ctx.canvas.style.transform = `rotate(${this.ang - this.PI / 2}rad)`;
    if (this.spin && this.spin.nativeElement) {
      this.spin.nativeElement.textContent = !this.angVel ? "Lancer" : sector.label;
      if (!first) {
        this.lastSelection = !this.angVel ? this.lastSelection : this.getIndex();
        this.deleteOption();
      }
      this.spin.nativeElement.style.background = sector.color;
    }
  }

  frame() {
    if (!this.angVel) return;

    this.angVel *= this.friction; // Decrement velocity by friction
    if (this.angVel < 0.002) this.angVel = 0; // Bring to stop
    this.ang += this.angVel; // Update angle
    this.ang %= this.TAU; // Normalize angle
    this.rotate();
  }

  engine() {
    requestAnimationFrame(this.frame.bind(this));
  }

  deleteOption() {
    if (this.modeDelete && !this.angVel) {
      this.addNewWinner(this.sectors[this.lastSelection].label);
      if (this.spin && this.spin.nativeElement) {
        
        this.spin.nativeElement.textContent = this.sectors[
          this.lastSelection
        ].label;
        
        
      }
    }
  }

  addNewWinner(value: any) {
    console.log(value);
  }

  public returnToPlayerSelection() {
    this.store.dispatch(new Navigate(['/player-selection']))
  }
}
